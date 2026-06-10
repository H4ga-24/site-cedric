"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

interface MilitariaItem {
  id: string;
  created_at?: string;
  title_fr: string;
  title_en: string;
  description_fr: string;
  description_en: string;
  price: number;
  era: "WW1" | "WW2" | "VIETNAM" | "POST_WAR";
  nationality: "US" | "DE" | "UK" | "OTHER";
  category: "HELMET" | "UNIFORM" | "MEDAL" | "EQUIPMENT" | "WEAPON" | "OTHER";
  markings?: string;
  condition?: string;
  certificate_number?: string;
  images: string[];
  status: "available" | "reserved" | "sold";
}

export default function Home() {
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [items, setItems] = useState<MilitariaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MilitariaItem | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // États de filtrage
  const [selectedEra, setSelectedEra] = useState<string>("ALL");
  const [selectedNationality, setSelectedNationality] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // État de l'espace Admin
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulaire d'ajout
  const [newTitleFr, setNewTitleFr] = useState("");
  const [newTitleEn, setNewTitleEn] = useState("");
  const [newDescFr, setNewDescFr] = useState("");
  const [newDescEn, setNewDescEn] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newEra, setNewEra] = useState<MilitariaItem["era"]>("WW2");
  const [newNationality, setNewNationality] = useState<MilitariaItem["nationality"]>("US");
  const [newCategory, setNewCategory] = useState<MilitariaItem["category"]>("HELMET");
  const [newMarkings, setNewMarkings] = useState("");
  const [newCondition, setNewCondition] = useState("");
  const [newCertNumber, setNewCertNumber] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const fetchItems = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur de récupération :", error.message);
    } else {
      setItems(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const uploadImages = async (files: FileList): Promise<string[]> => {
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${i}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("militaria-images")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Erreur upload :", uploadError.message);
        continue;
      }

      const { data } = supabase.storage
        .from("militaria-images")
        .getPublicUrl(filePath);

      if (data?.publicUrl) {
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitleFr || !newTitleEn || !newPrice) {
      alert("Veuillez remplir les titres et le prix.");
      return;
    }

    setIsSubmitting(true);
    let imageUrls: string[] = [];

    if (selectedFiles && selectedFiles.length > 0) {
      imageUrls = await uploadImages(selectedFiles);
    }

    const newItem = {
      title_fr: newTitleFr,
      title_en: newTitleEn,
      description_fr: newDescFr,
      description_en: newDescEn,
      price: parseFloat(newPrice),
      era: newEra,
      nationality: newNationality,
      category: newCategory,
      markings: newMarkings,
      condition: newCondition,
      certificate_number: newCertNumber,
      images: imageUrls.length > 0 ? imageUrls : ["https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=600&q=80"],
      status: "available"
    };

    const { error } = await supabase.from("items").insert([newItem]);

    if (error) {
      alert("Erreur : " + error.message);
    } else {
      alert("L'objet a été publié !");
      setNewTitleFr("");
      setNewTitleEn("");
      setNewDescFr("");
      setNewDescEn("");
      setNewPrice("");
      setNewMarkings("");
      setNewCondition("");
      setNewCertNumber("");
      setSelectedFiles(null);
      fetchItems();
    }
    setIsSubmitting(false);
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm("Supprimer cet objet ?")) {
      const { error } = await supabase.from("items").delete().eq("id", id);
      if (error) {
        alert("Erreur : " + error.message);
      } else {
        fetchItems();
      }
    }
  };

  const handleUnlockAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === "cedric123") {
      setIsUnlocked(true);
    } else {
      alert("Code d'accès incorrect");
    }
  };

  const eras = [
    { code: "ALL", fr: "Toutes les époques", en: "All Eras" },
    { code: "WW1", fr: "Première Guerre mondiale", en: "World War I" },
    { code: "WW2", fr: "Seconde Guerre mondiale", en: "World War II" },
    { code: "VIETNAM", fr: "Guerre du Vietnam", en: "Vietnam War" },
    { code: "POST_WAR", fr: "Après-guerre", en: "Post-War" },
  ];

  const nationalities = [
    { code: "ALL", fr: "Toutes les nationalités", en: "All Nationalities" },
    { code: "US", fr: "Américain", en: "American" },
    { code: "DE", fr: "Allemand", en: "German" },
    { code: "UK", fr: "Anglais", en: "English" },
    { code: "OTHER", fr: "Autre", en: "Other" },
  ];

  const categories = [
    { code: "ALL", fr: "Tous les équipements", en: "All Equipment" },
    { code: "HELMET", fr: "Casques / Coiffures", en: "Helmets & Headgear" },
    { code: "UNIFORM", fr: "Uniformes", en: "Uniforms" },
    { code: "MEDAL", fr: "Médailles & Insignes", en: "Medals & Badges" },
    { code: "EQUIPMENT", fr: "Équipements", en: "Equipment" },
    { code: "WEAPON", fr: "Armes neutralisées", en: "Neutralized Weapons" },
    { code: "OTHER", fr: "Divers Militaria", en: "Other Militaria" },
  ];

  const filteredItems = items.filter((item) => {
    const matchEra = selectedEra === "ALL" || item.era === selectedEra;
    const matchNat = selectedNationality === "ALL" || item.nationality === selectedNationality;
    const matchCat = selectedCategory === "ALL" || item.category === selectedCategory;
    return matchEra && matchNat && matchCat;
  });

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      
      {/* En-tête */}
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-serif tracking-wider text-stone-900 uppercase">
              CedMilitaria US
            </h1>
            <p className="text-[10px] text-stone-500 tracking-widest uppercase">
              {lang === "fr" ? "Achat - Vente - Expertise Militaria" : "Militaria Purchase - Sale - Appraisal"}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsAdminMode(!isAdminMode)}
              className="text-xs border border-stone-300 text-stone-600 px-3 py-1 hover:bg-stone-50 transition"
            >
              {isAdminMode ? "Admin ✕" : "Admin ⚙"}
            </button>

            <div className="flex gap-1 text-xs font-medium">
              <button
                onClick={() => setLang("fr")}
                className={`px-2.5 py-1 border transition ${lang === "fr" ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200"}`}
              >
                FR
              </button>
              <button
                onClick={() => setLang("en")}
                className={`px-2.5 py-1 border transition ${lang === "en" ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200"}`}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Éditorial / Présentation Commerciale */}
      <section className="bg-white border-b border-stone-200 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-xs font-serif italic text-stone-500 tracking-wider">
            {lang === "fr" ? "Commerce & Expertise d'Objets Militaires Historiques" : "Historical Military Antiquities Trade & Appraisal"}
          </span>
          <h2 className="text-3xl font-serif text-stone-900 mt-2 mb-6 tracking-wide leading-tight">
            {lang === "fr" ? "Achat, vente et négoce de pièces d'origine." : "Purchase, sale, and trade of original militaria."}
          </h2>
          <p className="text-stone-600 text-sm leading-relaxed max-w-2xl mx-auto font-sans">
  {lang === "fr" 
    ? "CedMilitaria US est spécialisé dans le négoce d'antiquités militaires d'époque. Parcourez notre catalogue pour acquérir des objets garantis d'origine. Nous sommes également acheteurs : si vous souhaitez nous proposer à la vente un objet historique ou une collection complète, contactez-nous."
    : "CedMilitaria US specializes in the trade of genuine vintage military antiquities. Browse our catalog to acquire guaranteed original items. We are also active buyers: if you wish to offer us a historical object or an entire collection for purchase, please get in touch."}
</p>
          <div className="h-px bg-stone-300 w-16 mx-auto mt-8"></div>
        </div>
      </section>

      {/* Section : Comment acquérir (Clair, transactionnel) */}
      <section className="bg-stone-100/50 border-b border-stone-200 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h4 className="text-center text-xs font-bold uppercase text-stone-400 tracking-widest mb-8">
            {lang === "fr" ? "Transactions & Commandes" : "Transactions & Inquiries"}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center text-xs">
            <div className="p-4">
              <span className="text-lg font-serif text-stone-500 block mb-2">01.</span>
              <h5 className="font-bold text-stone-800 uppercase mb-1">{lang === "fr" ? "Sélection de la pièce" : "Select an item"}</h5>
              <p className="text-stone-500 leading-relaxed">{lang === "fr" ? "Consultez les détails techniques, l'état de conservation et le prix de la pièce d'époque." : "Review technical details, condition grade, and pricing of the vintage piece."}</p>
            </div>
            <div className="p-4 border-y md:border-y-0 md:border-x border-stone-200">
              <span className="text-lg font-serif text-stone-500 block mb-2">02.</span>
              <h5 className="font-bold text-stone-800 uppercase mb-1">{lang === "fr" ? "Offre d'achat / Contact" : "Offer / Inquiry"}</h5>
              <p className="text-stone-500 leading-relaxed">{lang === "fr" ? "Cliquez sur 'Nous contacter' pour bloquer la pièce ou me faire une proposition sur un lot." : "Click 'Contact us' to hold an item or make an offer on a grouping."}</p>
            </div>
            <div className="p-4">
              <span className="text-lg font-serif text-stone-500 block mb-2">03.</span>
              <h5 className="font-bold text-stone-800 uppercase mb-1">{lang === "fr" ? "Paiement & Expédition" : "Payment & Delivery"}</h5>
              <p className="text-stone-500 leading-relaxed">{lang === "fr" ? "Finalisation directe de la transaction (PayPal, virement) et envoi sécurisé avec suivi." : "Direct finalization (PayPal, bank transfer) and tracked express shipping."}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Module Administration */}
      {isAdminMode && (
        <section className="bg-stone-100 border-b border-stone-200 p-6">
          <div className="max-w-3xl mx-auto bg-white p-6 rounded-md shadow-xs border border-stone-200">
            <h3 className="text-lg font-serif mb-4 text-stone-800 border-b pb-2">
              {lang === "fr" ? "Déposer une annonce de collection" : "Publish a Collectible Item"}
            </h3>

            {!isUnlocked ? (
              <form onSubmit={handleUnlockAdmin} className="flex gap-2">
                <input
                  type="password"
                  placeholder={lang === "fr" ? "Code d'accès modérateur" : "Moderator passcode"}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="border border-stone-300 p-2 text-sm flex-1"
                />
                <button type="submit" className="bg-stone-800 text-white px-4 py-2 text-sm hover:bg-stone-700">
                  {lang === "fr" ? "Déverrouiller" : "Unlock"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Titre (Français)</label>
                    <input
                      type="text"
                      value={newTitleFr}
                      onChange={(e) => setNewTitleFr(e.target.value)}
                      className="w-full border border-stone-300 p-2 text-sm"
                      placeholder="Ex: Casque Allemand M42..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Title (English)</label>
                    <input
                      type="text"
                      value={newTitleEn}
                      onChange={(e) => setNewTitleEn(e.target.value)}
                      className="w-full border border-stone-300 p-2 text-sm"
                      placeholder="Ex: German M42 Helmet..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Description (Français)</label>
                    <textarea
                      value={newDescFr}
                      onChange={(e) => setNewDescFr(e.target.value)}
                      className="w-full border border-stone-300 p-2 text-sm h-20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Description (English)</label>
                    <textarea
                      value={newDescEn}
                      onChange={(e) => setNewDescEn(e.target.value)}
                      className="w-full border border-stone-300 p-2 text-sm h-20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Prix (€)</label>
                    <input
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="w-full border border-stone-300 p-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Époque</label>
                    <select
                      value={newEra}
                      onChange={(e) => setNewEra(e.target.value as MilitariaItem["era"])}
                      className="w-full border border-stone-300 p-2 text-sm"
                    >
                      <option value="WW1">World War I</option>
                      <option value="WW2">World War II</option>
                      <option value="VIETNAM">Vietnam War</option>
                      <option value="POST_WAR">Post-War</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Nationalité</label>
                    <select
                      value={newNationality}
                      onChange={(e) => setNewNationality(e.target.value as MilitariaItem["nationality"])}
                      className="w-full border border-stone-300 p-2 text-sm"
                    >
                      <option value="US">Américain</option>
                      <option value="DE">Allemand</option>
                      <option value="UK">Anglais</option>
                      <option value="OTHER">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Équipement</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as MilitariaItem["category"])}
                      className="w-full border border-stone-300 p-2 text-sm"
                    >
                      <option value="HELMET">Casque / Coiffure</option>
                      <option value="UNIFORM">Uniforme</option>
                      <option value="MEDAL">Médaille / Insigne</option>
                      <option value="EQUIPMENT">Équipement</option>
                      <option value="WEAPON">Arme neutralisée</option>
                      <option value="OTHER">Divers</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Marquages / Fabricant</label>
                    <input
                      type="text"
                      value={newMarkings}
                      onChange={(e) => setNewMarkings(e.target.value)}
                      className="w-full border border-stone-300 p-2 text-sm"
                      placeholder="Ex: Q66, McCord..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">État de conservation</label>
                    <input
                      type="text"
                      value={newCondition}
                      onChange={(e) => setNewCondition(e.target.value)}
                      className="w-full border border-stone-300 p-2 text-sm"
                      placeholder="Ex: Excellent, Mint, Combat Wear..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">N° de Certificat (Armes neut.)</label>
                    <input
                      type="text"
                      value={newCertNumber}
                      onChange={(e) => setNewCertNumber(e.target.value)}
                      className="w-full border border-stone-300 p-2 text-sm"
                      placeholder="Ex: St-Etienne 4287..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Photos de l'objet (Max 3, Haute définition)</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setSelectedFiles(e.target.files)}
                    className="w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-semibold file:bg-stone-800 file:text-white hover:file:bg-stone-700"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-stone-900 text-white py-2 hover:bg-stone-800 transition text-sm tracking-wider uppercase font-medium disabled:bg-stone-400"
                >
                  {isSubmitting ? "Publication en cours..." : "Mettre l'objet en vente"}
                </button>
              </form>
            )}
          </div>
        </section>
      )}

      {/* Barre de filtres */}
      <nav className="bg-white border-b border-stone-200 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="w-full md:w-auto">
            <span className="text-xs font-bold text-stone-400 uppercase block mb-1 tracking-wider">{lang === "fr" ? "Filtrer par époque" : "Filter by Era"}</span>
            <select
              value={selectedEra}
              onChange={(e) => setSelectedEra(e.target.value)}
              className="border border-stone-200 p-2.5 text-xs bg-stone-50 text-stone-700 rounded-sm w-full md:w-48 cursor-pointer focus:outline-none focus:border-stone-400"
            >
              {eras.map(e => <option key={e.code} value={e.code}>{lang === "fr" ? e.fr : e.en}</option>)}
            </select>
          </div>

          <div className="w-full md:w-auto">
            <span className="text-xs font-bold text-stone-400 uppercase block mb-1 tracking-wider">{lang === "fr" ? "Filtrer par nationalité" : "Filter by Nationality"}</span>
            <select
              value={selectedNationality}
              onChange={(e) => setSelectedNationality(e.target.value)}
              className="border border-stone-200 p-2.5 text-xs bg-stone-50 text-stone-700 rounded-sm w-full md:w-48 cursor-pointer focus:outline-none focus:border-stone-400"
            >
              {nationalities.map(n => <option key={n.code} value={n.code}>{lang === "fr" ? n.fr : n.en}</option>)}
            </select>
          </div>

          <div className="w-full md:w-auto">
            <span className="text-xs font-bold text-stone-400 uppercase block mb-1 tracking-wider">{lang === "fr" ? "Filtrer par équipement" : "Filter by Equipment"}</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-stone-200 p-2.5 text-xs bg-stone-50 text-stone-700 rounded-sm w-full md:w-48 cursor-pointer focus:outline-none focus:border-stone-400"
            >
              {categories.map(c => <option key={c.code} value={c.code}>{lang === "fr" ? c.fr : c.en}</option>)}
            </select>
          </div>
        </div>
      </nav>

      {/* Galerie */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-12">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-serif text-stone-900 tracking-wide uppercase">
              {lang === "fr" ? `Catalogue en ligne (${filteredItems.length} pièces)` : `Online catalog (${filteredItems.length} items)`}
            </h2>
            <div className="h-px bg-stone-300 mt-2 w-16"></div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <p className="text-stone-400 text-xs italic">{lang === "fr" ? "Ouverture du catalogue..." : "Opening catalog..."}</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 border border-stone-200 bg-white rounded-sm">
            <p className="text-stone-400 text-xs">{lang === "fr" ? "Aucune pièce disponible avec ces filtres." : "No pieces match these criteria."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                onClick={() => { setSelectedItem(item); setActiveImageIdx(0); }}
                className="border border-stone-200 bg-white hover:border-stone-400 transition-all duration-300 flex flex-col justify-between relative cursor-pointer group rounded-sm"
              >
                {isAdminMode && isUnlocked && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                    className="absolute top-2 right-2 bg-red-600 text-white text-[10px] px-2 py-1 rounded hover:bg-red-700 z-10"
                  >
                    Supprimer
                  </button>
                )}

                <div>
                  <div className="aspect-video w-full bg-stone-50 relative overflow-hidden border-b border-stone-200">
                    <img
                      src={item.images[0]}
                      alt={lang === "fr" ? item.title_fr : item.title_en}
                      className="object-cover w-full h-full transition duration-500 group-hover:scale-102"
                    />
                    <span className="absolute bottom-2 left-2 bg-stone-950/90 text-white text-[9px] font-medium tracking-widest uppercase px-2 py-0.5">
                      {eras.find(e => e.code === item.era)?.fr}
                    </span>
                    <span className="absolute bottom-2 right-2 bg-stone-200/90 text-stone-800 text-[9px] font-medium px-2 py-0.5 uppercase tracking-widest">
                      {nationalities.find(n => n.code === item.nationality)?.fr}
                    </span>
                  </div>

                  <div className="p-6">
                    <div className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">
                      {categories.find(c => c.code === item.category)?.fr}
                    </div>
                    <h3 className="text-base font-serif text-stone-900 leading-snug mb-2 group-hover:text-stone-700 transition">
                      {lang === "fr" ? item.title_fr : item.title_en}
                    </h3>
                    <p className="text-xs text-stone-500 line-clamp-3 leading-relaxed">
                      {lang === "fr" ? item.description_fr : item.description_en}
                    </p>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <div className="pt-4 border-t border-stone-100 flex justify-between items-center">
                    <span className="text-base font-mono font-bold text-stone-950">{item.price} €</span>
                    <span className="text-stone-400 text-xs group-hover:text-stone-700 transition">{lang === "fr" ? "Détails" : "Details"} →</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Pop-up / Modal Fiche Détaillée */}
      {selectedItem && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-sm border border-stone-200 shadow-2xl flex flex-col md:flex-row">
            
            <div className="md:w-1/2 bg-stone-50 p-6 flex flex-col justify-between border-r border-stone-200">
              <div className="aspect-square w-full relative overflow-hidden bg-white border border-stone-200 rounded-sm">
                <img
                  src={selectedItem.images[activeImageIdx]}
                  alt="Full-size"
                  className="object-contain w-full h-full"
                />
              </div>
              <div className="flex gap-2 mt-4 overflow-x-auto py-1">
                {selectedItem.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`w-20 h-14 border rounded-xs overflow-hidden flex-shrink-0 transition ${activeImageIdx === idx ? "border-stone-800 ring-1 ring-stone-800" : "border-stone-200"}`}
                  >
                    <img src={img} alt="Miniature" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="md:w-1/2 p-8 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] bg-stone-100 text-stone-600 px-2.5 py-1 uppercase tracking-widest font-semibold">
                    {categories.find(c => c.code === selectedItem.category)?.fr}
                  </span>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="text-stone-400 hover:text-stone-700 text-lg transition"
                  >
                    ✕
                  </button>
                </div>

                <h3 className="text-xl font-serif text-stone-900 mb-3">
                  {lang === "fr" ? selectedItem.title_fr : selectedItem.title_en}
                </h3>
                
                <p className="text-xs text-stone-600 leading-relaxed mb-6 whitespace-pre-wrap">
                  {lang === "fr" ? selectedItem.description_fr : selectedItem.description_en}
                </p>

                <div className="bg-stone-50 p-4 border border-stone-200 rounded-sm space-y-2 text-xs text-stone-700">
                  <div className="flex justify-between border-b border-stone-200 pb-1.5">
                    <span className="font-bold uppercase text-stone-400 text-[9px] tracking-wider">{lang === "fr" ? "Époque" : "Era"}</span>
                    <span>{eras.find(e => e.code === selectedItem.era)?.fr}</span>
                  </div>
                  <div className="flex justify-between border-b border-stone-200 pb-1.5">
                    <span className="font-bold uppercase text-stone-400 text-[9px] tracking-wider">{lang === "fr" ? "Origine" : "Nationality"}</span>
                    <span>{nationalities.find(n => n.code === selectedItem.nationality)?.fr}</span>
                  </div>
                  {selectedItem.markings && (
                    <div className="flex justify-between border-b border-stone-200 pb-1.5">
                      <span className="font-bold uppercase text-stone-400 text-[9px] tracking-wider">{lang === "fr" ? "Marquages" : "Markings"}</span>
                      <span className="font-mono text-stone-900 font-semibold">{selectedItem.markings}</span>
                    </div>
                  )}
                  {selectedItem.condition && (
                    <div className="flex justify-between border-b border-stone-200 pb-1.5">
                      <span className="font-bold uppercase text-stone-400 text-[9px] tracking-wider">{lang === "fr" ? "État de cons." : "Condition"}</span>
                      <span className="text-stone-900 font-semibold">{selectedItem.condition}</span>
                    </div>
                  )}
                  {selectedItem.certificate_number && (
                    <div className="flex justify-between text-amber-900 bg-amber-50 p-1.5 rounded-xs">
                      <span className="font-bold uppercase text-[9px] tracking-wider">{lang === "fr" ? "Certificat" : "Certificate"}</span>
                      <span className="font-mono font-semibold">{selectedItem.certificate_number}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-stone-200 mt-6 flex justify-between items-center">
                <span className="text-2xl font-mono font-bold text-stone-950">{selectedItem.price} €</span>
                <a
                  href={`mailto:cedric-timer@orange.fr?subject=Interet pour l'objet : ${selectedItem.title_fr}`}
                  className="bg-stone-900 text-white hover:bg-stone-800 py-2.5 px-6 tracking-wider uppercase text-xs font-semibold rounded-xs transition"
                >
                  {lang === "fr" ? "Nous contacter" : "Contact us"}
                </a>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Pied de page */}
      <footer className="bg-stone-950 text-stone-500 text-xs py-16 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div>
            <p className="font-serif text-stone-200 uppercase tracking-widest text-sm mb-1">CedMilitaria US</p>
            <p className="text-stone-600">{lang === "fr" ? "Achat, vente et expertise d'antiquités militaires historiques." : "Purchase, sale, and appraisal of historical military antiquities."}</p>
          </div>
          <div>
            <p className="text-stone-700">
              {lang === "fr" ? "© Tous droits réservés. CedMilitaria US." : "© All rights reserved. CedMilitaria US."}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
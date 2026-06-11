"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

interface SubItem {
  nameFr: string;
  nameEn: string;
  conditionFr: string;
  conditionEn: string;
  markings: string;
}

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
  is_lot: boolean;
  lot_content: SubItem[];
}

interface ImagePreview {
  id: string;
  file: File;
  previewUrl: string;
}

export default function Home() {
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [items, setItems] = useState<MilitariaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MilitariaItem | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // États de filtrage & Recherche textuelle
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEra, setSelectedEra] = useState<string>("ALL");
  const [selectedNationality, setSelectedNationality] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Sécurité Administrateur (Mot de passe simple)
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLegal, setShowLegal] = useState(false);

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

  // Gestion des images interactives (Limite : 20)
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);

  // Gestion du lot dynamique
  const [isLot, setIsLot] = useState(false);
  const [lotContent, setLotContent] = useState<SubItem[]>([]);

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

  useEffect(() => {
    return () => {
      imagePreviews.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
  }, [imagePreviews]);

  // Gérer la sélection des images (Limite 20)
  const handleImageSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const newPreviews = filesArray.map((file) => ({
        id: Math.random().toString(36).substring(2, 9),
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      setImagePreviews((prev) => [...prev, ...newPreviews].slice(0, 20));
    }
  };

  const handleRemoveSelectedImage = (id: string) => {
    setImagePreviews((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((img) => img.id !== id);
    });
  };

  const handleMoveImage = (index: number, direction: "left" | "right") => {
    const targetIdx = direction === "left" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= imagePreviews.length) return;

    const updated = [...imagePreviews];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setImagePreviews(updated);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    const dragIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (dragIndex === targetIndex) return;

    const updated = [...imagePreviews];
    const draggedItem = updated[dragIndex];
    updated.splice(dragIndex, 1);
    updated.splice(targetIndex, 0, draggedItem);
    setImagePreviews(updated);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const uploadOrderedImages = async () => {
    const urls: string[] = [];
    for (let i = 0; i < imagePreviews.length; i++) {
      const { file } = imagePreviews[i];
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${i}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("militaria-images")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Erreur d'envoi :", uploadError.message);
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

    if (imagePreviews.length > 0) {
      imageUrls = await uploadOrderedImages();
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
      markings: isLot ? "" : newMarkings,
      condition: isLot ? "" : newCondition,
      certificate_number: newCertNumber,
      images: imageUrls.length > 0 ? imageUrls : ["https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=600&q=80"],
      status: "available",
      is_lot: isLot,
      lot_content: isLot ? lotContent : []
    };

    const { error } = await supabase.from("items").insert([newItem]);

    if (error) {
      alert("Erreur : " + error.message);
    } else {
      alert("L'objet ou le lot a été publié avec succès !");
      setNewTitleFr("");
      setNewTitleEn("");
      setNewDescFr("");
      setNewDescEn("");
      setNewPrice("");
      setNewMarkings("");
      setNewCondition("");
      setNewCertNumber("");
      setImagePreviews([]);
      setIsLot(false);
      setLotContent([]);
      fetchItems();
    }
    setIsSubmitting(false);
  };

  const addSubItemField = () => {
    setLotContent([...lotContent, { nameFr: "", nameEn: "", conditionFr: "", conditionEn: "", markings: "" }]);
  };

  const removeSubItemField = (index: number) => {
    const updated = lotContent.filter((_, idx) => idx !== index);
    setLotContent(updated);
  };

  const updateSubItemField = (index: number, field: keyof SubItem, value: string) => {
    const updated = [...lotContent];
    updated[index][field] = value;
    setLotContent(updated);
  };

  const handleUnlockAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === "cedric123") {
      setIsUnlocked(true);
      setAdminPassword("");
    } else {
      alert("Code d'accès incorrect");
    }
  };

  const handleLogout = () => {
    setIsUnlocked(false);
  };

  const handleUpdateStatus = async (id: string, status: MilitariaItem["status"]) => {
    const { error } = await supabase
      .from("items")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert("Erreur : " + error.message);
    } else {
      fetchItems();
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm("Supprimer cet objet du catalogue ?")) {
      const { error } = await supabase.from("items").delete().eq("id", id);
      if (error) {
        alert("Erreur : " + error.message);
      } else {
        fetchItems();
      }
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

  // FILTRAGE ET RECHERCHE TEXTUELLE INTELLIGENTE
  const filteredItems = items.filter((item) => {
    const matchEra = selectedEra === "ALL" || item.era === selectedEra;
    const matchNat = selectedNationality === "ALL" || item.nationality === selectedNationality;
    const matchCat = selectedCategory === "ALL" || item.category === selectedCategory;

    // Comparaison textuelle insensible à la casse sur les titres, descriptions et marquages
    const textFr = (item.title_fr + " " + item.description_fr + " " + (item.markings || "")).toLowerCase();
    const textEn = (item.title_en + " " + item.description_en + " " + (item.markings || "")).toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchText = textFr.includes(query) || textEn.includes(query);

    return matchEra && matchNat && matchCat && matchText;
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
              className={`text-xs border px-3 py-1 transition ${isUnlocked ? "border-amber-600 text-amber-700 bg-amber-50" : "border-stone-300 text-stone-600 hover:bg-stone-50"}`}
            >
              {isUnlocked ? (lang === "fr" ? "Admin Déverrouillé" : "Admin Unlocked") : (lang === "fr" ? "Connexion Admin" : "Admin Login")}
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

      {/* Présentation Commerciale */}
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
              : "CedMilitaria US specializes in the trade of genuine vintage military antiques. Browse our catalog to acquire guaranteed original items. We are also active buyers: if you wish to offer us a historical object or an entire collection for purchase, please get in touch."}
          </p>
          <div className="h-px bg-stone-300 w-16 mx-auto mt-8"></div>
        </div>
      </section>

      {/* BANDEAU RECONSTITUÉ : ACHAT DE COLLECTION UNIQUE */}
      <section className="bg-stone-50 border-b border-stone-200 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-8 border border-stone-200 rounded-sm flex flex-col justify-between shadow-2xs hover:border-stone-400 transition-all duration-300 text-center">
            <div>
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block mb-1">
                {lang === "fr" ? "Sourcing & Estimation" : "Appraisal & Sourcing"}
              </span>
              <h3 className="text-xl font-serif text-stone-950 mb-3">
                {lang === "fr" ? "Vous vendez une collection ou un objet d'époque ?" : "Selling an item or an entire vintage collection?"}
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed mb-6 max-w-2xl mx-auto">
                {lang === "fr"
                  ? "Nous estimons gratuitement vos objets militaires d'époque sur photos et rachetons au comptant des pièces uniques ou des collections complètes. Discrétion et sérieux garantis."
                  : "We offer free vintage military appraisal on photos and buy single rare items or entire groupings. Discretion and expert service guaranteed."}
              </p>
            </div>
            <a
              href={`mailto:votre-email@example.com?subject=Proposition de vente - Collection Militaria`}
              className="bg-stone-900 text-white hover:bg-stone-800 self-center py-2.5 px-12 tracking-wider uppercase text-xs font-semibold rounded-xs transition"
            >
              {lang === "fr" ? "Nous proposer une collection" : "Offer us a collection"}
            </a>
          </div>
        </div>
      </section>

      {/* Transactions & Commandes */}
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
            
            {!isUnlocked ? (
              <form onSubmit={handleUnlockAdmin} className="space-y-4">
                <h3 className="text-sm font-bold uppercase text-stone-500 tracking-wider mb-2">
                  {lang === "fr" ? "Déverrouiller l'Espace Administrateur" : "Unlock Admin Space"}
                </h3>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder={lang === "fr" ? "Code d'accès administrateur" : "Admin passcode"}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="border border-stone-300 p-2 text-sm flex-1"
                    required
                  />
                  <button type="submit" className="bg-stone-900 text-white px-6 py-2 text-sm hover:bg-stone-800 transition uppercase tracking-wider font-medium">
                    {lang === "fr" ? "Valider" : "Submit"}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                  <h3 className="text-lg font-serif text-stone-800">
                    {lang === "fr" ? "Déposer une annonce" : "Publish a Collectible"}
                  </h3>
                  <button onClick={handleLogout} className="text-xs text-red-600 hover:underline">
                    {lang === "fr" ? "Verrouiller à nouveau" : "Lock Admin"}
                  </button>
                </div>

                <form onSubmit={handleAddItem} className="space-y-4">
                  
                  <div className="bg-stone-50 p-3 border border-stone-200 rounded-sm flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isLotCheck"
                      checked={isLot}
                      onChange={(e) => setIsLot(e.target.checked)}
                      className="w-4 h-4 accent-stone-850"
                    />
                    <label htmlFor="isLotCheck" className="text-xs font-bold uppercase text-stone-700 cursor-pointer">
                      {lang === "fr" ? "Cet article est un LOT groupé d'objets différents" : "This article is a grouped LOT of different items"}
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Titre (Français)</label>
                      <input
                        type="text"
                        value={newTitleFr}
                        onChange={(e) => setNewTitleFr(e.target.value)}
                        className="w-full border border-stone-300 p-2 text-sm"
                        placeholder="Ex: Lot de paquetage d'un GI américain..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Title (English)</label>
                      <input
                        type="text"
                        value={newTitleEn}
                        onChange={(e) => setNewTitleEn(e.target.value)}
                        className="w-full border border-stone-300 p-2 text-sm"
                        placeholder="Ex: US Soldier Gear Grouping..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Description Générale (Français)</label>
                      <textarea
                        value={newDescFr}
                        onChange={(e) => setNewDescFr(e.target.value)}
                        className="w-full border border-stone-300 p-2 text-sm h-20"
                        placeholder="Présentation générale du lot historique..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-stone-500 mb-1">General Description (English)</label>
                      <textarea
                        value={newDescEn}
                        onChange={(e) => setNewDescEn(e.target.value)}
                        className="w-full border border-stone-300 p-2 text-sm h-20"
                        placeholder="General historical grouping details..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Prix Global du Lot (€)</label>
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
                      <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Nationalité dominante</label>
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
                      <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Équipement principal</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(newCategory)}
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

                  {!isLot ? (
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
                  ) : (
                    <div className="border border-stone-200 bg-stone-50 p-4 rounded-sm space-y-4">
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-xs font-bold text-stone-700 uppercase">Composition détaillée du lot</span>
                        <button
                          type="button"
                          onClick={addSubItemField}
                          className="text-xs bg-stone-800 text-white px-3 py-1 hover:bg-stone-700 transition"
                        >
                          + Ajouter un objet au lot
                        </button>
                      </div>

                      {lotContent.length === 0 ? (
                        <p className="text-xs text-stone-500 text-center py-4 italic">Aucun objet ajouté pour l'instant. Cliquez ci-dessus pour composer votre lot.</p>
                      ) : (
                        <div className="space-y-4">
                          {lotContent.map((sub, idx) => (
                            <div key={idx} className="bg-white p-3 border border-stone-200 rounded-sm relative space-y-3">
                              <button
                                type="button"
                                onClick={() => removeSubItemField(idx)}
                                className="absolute top-2 right-2 text-red-600 font-bold text-xs hover:underline"
                              >
                                Supprimer ✕
                              </button>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                <input
                                  type="text"
                                  placeholder="Nom de l'objet (FR) - Ex: Casque M1"
                                  value={sub.nameFr}
                                  onChange={(e) => updateSubItemField(idx, "nameFr", e.target.value)}
                                  className="border p-2 text-xs w-full"
                                  required
                                />
                                <input
                                  type="text"
                                  placeholder="Item Name (EN) - Ex: M1 Helmet"
                                  value={sub.nameEn}
                                  onChange={(e) => updateSubItemField(idx, "nameEn", e.target.value)}
                                  className="border p-2 text-xs w-full"
                                  required
                                />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <input
                                  type="text"
                                  placeholder="État de conservation (FR) - Ex: Très bon"
                                  value={sub.conditionFr}
                                  onChange={(e) => updateSubItemField(idx, "conditionFr", e.target.value)}
                                  className="border p-2 text-xs w-full"
                                />
                                <input
                                  type="text"
                                  placeholder="Condition (EN) - Ex: Very Good"
                                  value={sub.conditionEn}
                                  onChange={(e) => updateSubItemField(idx, "conditionEn", e.target.value)}
                                  className="border p-2 text-xs w-full"
                                />
                                <input
                                  type="text"
                                  placeholder="Marquages / Fabricant - Ex: McCord"
                                  value={sub.markings}
                                  onChange={(e) => updateSubItemField(idx, "markings", e.target.value)}
                                  className="border p-2 text-xs w-full"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Prévisualisations interactives */}
                  <div className="border border-stone-200 p-4 rounded-sm bg-stone-50 space-y-4">
                    <label className="block text-xs font-bold uppercase text-stone-700">
                      {lang === "fr" ? "Sélection & Organisation des Photos (Max 20)" : "Photo Selection & Rearranging (Max 20)"}
                    </label>
                    
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelection}
                      className="text-xs text-stone-500 file:mr-4 file:py-1.5 file:px-3 file:border-0 file:text-xs file:font-semibold file:bg-stone-800 file:text-white hover:file:bg-stone-700 cursor-pointer w-full"
                    />

                    {imagePreviews.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
                        {imagePreviews.map((img, idx) => (
                          <div
                            key={img.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, idx)}
                            onDrop={(e) => handleDrop(e, idx)}
                            onDragOver={handleDragOver}
                            className={`border bg-white rounded-xs p-1 flex flex-col relative group cursor-move shadow-xs hover:border-stone-400 transition-all ${idx === 0 ? "border-amber-600 ring-1 ring-amber-600" : "border-stone-200"}`}
                          >
                            <div className="aspect-square w-full relative bg-stone-100 overflow-hidden">
                              <img src={img.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                              
                              {idx === 0 && (
                                <span className="absolute top-1 left-1 bg-amber-600 text-white text-[8px] font-bold px-1.5 py-0.5 uppercase tracking-wide rounded-xs">
                                  {lang === "fr" ? "Couverture" : "Cover"}
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleRemoveSelectedImage(img.id)}
                                className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center transition-all opacity-90"
                                title="Supprimer"
                              >
                                ✕
                              </button>
                            </div>

                            <div className="flex justify-between items-center mt-2 px-1">
                              <button
                                type="button"
                                onClick={() => handleMoveImage(idx, "left")}
                                disabled={idx === 0}
                                className="text-xs font-bold text-stone-500 hover:text-stone-900 disabled:opacity-30 disabled:hover:text-stone-500"
                                title="Déplacer à gauche"
                              >
                                ◀
                              </button>
                              <span className="text-[10px] text-stone-400 font-mono">Pos. {idx + 1}</span>
                              <button
                                type="button"
                                onClick={() => handleMoveImage(idx, "right")}
                                disabled={idx === imagePreviews.length - 1}
                                className="text-xs font-bold text-stone-500 hover:text-stone-900 disabled:opacity-30 disabled:hover:text-stone-500"
                                title="Déplacer à droite"
                              >
                                ▶
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-stone-900 text-white py-2 hover:bg-stone-800 transition text-sm tracking-wider uppercase font-medium disabled:bg-stone-400"
                  >
                    {isSubmitting ? "Publication en cours..." : "Mettre l'objet ou le lot en vente"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Bandeau de Garantie d'Authenticité */}
      <section className="bg-stone-950 text-white py-4 px-4 text-center border-y border-stone-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-center items-center gap-2 md:gap-6 text-[11px] tracking-widest uppercase font-serif">
          <span className="text-amber-500 font-bold">★ CedMilitaria US Guarantee ★</span>
          <span className="text-stone-300">
            {lang === "fr" 
              ? "Toutes nos pièces sont vendues avec une garantie d'authenticité historique d'époque à vie." 
              : "All collectibles are sold with a lifetime guarantee of historical period authenticity."}
          </span>
        </div>
      </section>

      {/* Barre de recherche textuelle ET Filtres */}
      <nav className="bg-white border-b border-stone-200 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 items-end justify-between">
          
          {/* BARRE DE RECHERCHE TEXTUELLE DU CATALOGUE */}
          <div className="w-full md:flex-1">
            <label className="text-xs font-bold text-stone-400 uppercase block mb-1 tracking-wider">
              {lang === "fr" ? "Rechercher un objet d'époque" : "Search the catalog"}
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === "fr" ? "Tapez un nom, un fabricant, un mot-clé (Ex: M1, Casque, McCord...)" : "Enter a name, marking, keyword (Ex: M1, Helmet, McCord...)"}
              className="border border-stone-200 p-2.5 text-xs bg-stone-50 text-stone-700 rounded-sm w-full focus:outline-none focus:border-stone-400"
            />
          </div>

          <div className="w-full md:w-auto">
            <span className="text-xs font-bold text-stone-400 uppercase block mb-1 tracking-wider">{lang === "fr" ? "Époque" : "Era"}</span>
            <select
              value={selectedEra}
              onChange={(e) => setSelectedEra(e.target.value)}
              className="border border-stone-200 p-2.5 text-xs bg-stone-50 text-stone-700 rounded-sm w-full md:w-40 cursor-pointer focus:outline-none focus:border-stone-400"
            >
              {eras.map(e => <option key={e.code} value={e.code}>{lang === "fr" ? e.fr : e.en}</option>)}
            </select>
          </div>

          <div className="w-full md:w-auto">
            <span className="text-xs font-bold text-stone-400 uppercase block mb-1 tracking-wider">{lang === "fr" ? "Nationalité" : "Nationality"}</span>
            <select
              value={selectedNationality}
              onChange={(e) => setSelectedNationality(e.target.value)}
              className="border border-stone-200 p-2.5 text-xs bg-stone-50 text-stone-700 rounded-sm w-full md:w-40 cursor-pointer focus:outline-none focus:border-stone-400"
            >
              {nationalities.map(n => <option key={n.code} value={n.code}>{lang === "fr" ? n.fr : n.en}</option>)}
            </select>
          </div>

          <div className="w-full md:w-auto">
            <span className="text-xs font-bold text-stone-400 uppercase block mb-1 tracking-wider">{lang === "fr" ? "Équipement" : "Equipment"}</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-stone-200 p-2.5 text-xs bg-stone-50 text-stone-700 rounded-sm w-full md:w-40 cursor-pointer focus:outline-none focus:border-stone-400"
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
            {filteredItems.map((item) => {
              const isReserved = item.status === "reserved";
              const isSold = item.status === "sold";

              return (
                <article
                  key={item.id}
                  onClick={() => { setSelectedItem(item); setActiveImageIdx(0); }}
                  className={`border border-stone-200 bg-white hover:border-stone-400 transition-all duration-300 flex flex-col justify-between relative cursor-pointer group rounded-sm ${isSold ? "opacity-65" : ""}`}
                >
                  {isUnlocked && (
                    <div className="absolute top-2 left-2 right-2 flex justify-between gap-1 z-10" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleUpdateStatus(item.id, "available")}
                          className={`text-[9px] px-1.5 py-0.5 rounded border transition ${item.status === "available" ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-600 border-stone-200"}`}
                        >
                          Dispo
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(item.id, "reserved")}
                          className={`text-[9px] px-1.5 py-0.5 rounded border transition ${item.status === "reserved" ? "bg-amber-600 text-white border-amber-600" : "bg-white text-stone-600 border-stone-200"}`}
                        >
                          Réserve
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(item.id, "sold")}
                          className={`text-[9px] px-1.5 py-0.5 rounded border transition ${item.status === "sold" ? "bg-red-600 text-white border-red-600" : "bg-white text-stone-600 border-stone-200"}`}
                        >
                          Vendu
                        </button>
                      </div>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="bg-red-700 text-white text-[9px] px-2 py-0.5 rounded hover:bg-red-800"
                      >
                        Supr.
                      </button>
                    </div>
                  )}

                  <div>
                    <div className="aspect-video w-full bg-stone-50 relative overflow-hidden border-b border-stone-200">
                      <img
                        src={item.images[0]}
                        alt={lang === "fr" ? item.title_fr : item.title_en}
                        className="object-cover w-full h-full transition duration-500 group-hover:scale-102"
                      />
                      
                      {isSold && (
                        <div className="absolute inset-0 bg-stone-900/40 flex items-center justify-center">
                          <span className="bg-red-600 text-white font-serif text-sm tracking-widest uppercase px-4 py-1.5 border border-white">
                            {lang === "fr" ? "VENDU" : "SOLD"}
                          </span>
                        </div>
                      )}
                      
                      {isReserved && !isSold && (
                        <div className="absolute inset-0 bg-amber-900/10 flex items-center justify-center">
                          <span className="bg-amber-600 text-white font-serif text-sm tracking-widest uppercase px-4 py-1.5 border border-white">
                            {lang === "fr" ? "RÉSERVÉ" : "RESERVED"}
                          </span>
                        </div>
                      )}

                      {item.is_lot && (
                        <span className="absolute top-2 left-2 bg-amber-600 text-white text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-xs z-10">
                          {lang === "fr" ? "LOT" : "LOT"}
                        </span>
                      )}

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
              );
            })}
          </div>
        )}
      </main>

      {/* Pop-up Fiche Détaillée */}
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
              <div className="flex gap-2 mt-4 overflow-x-auto py-1 animate-fadeIn">
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
                  <div className="flex gap-1">
                    <span className="text-[10px] bg-stone-100 text-stone-600 px-2.5 py-1 uppercase tracking-widest font-semibold">
                      {categories.find(c => c.code === selectedItem.category)?.fr}
                    </span>
                    {selectedItem.is_lot && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2.5 py-1 uppercase tracking-widest font-bold">
                        LOT
                      </span>
                    )}
                    {selectedItem.status === "sold" && (
                      <span className="text-[10px] bg-red-100 text-red-700 px-2.5 py-1 uppercase tracking-widest font-semibold">
                        Vendu / Sold
                      </span>
                    )}
                    {selectedItem.status === "reserved" && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2.5 py-1 uppercase tracking-widest font-semibold">
                        Réservé / Reserved
                      </span>
                    )}
                  </div>
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

                {selectedItem.is_lot && selectedItem.lot_content && selectedItem.lot_content.length > 0 ? (
                  <div className="mb-6">
                    <h4 className="text-[10px] font-bold uppercase text-stone-400 tracking-wider mb-2">{lang === "fr" ? "Composition détaillée du lot" : "Lot Content details"}</h4>
                    <div className="border border-stone-200 rounded-sm overflow-hidden text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-stone-100 text-stone-500 font-bold border-b border-stone-200">
                            <th className="p-2">{lang === "fr" ? "Objet" : "Item"}</th>
                            <th className="p-2">{lang === "fr" ? "État" : "Condition"}</th>
                            <th className="p-2">{lang === "fr" ? "Marquages" : "Markings"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 text-stone-700 bg-white">
                          {selectedItem.lot_content.map((sub, idx) => (
                            <tr key={idx}>
                              <td className="p-2 font-medium">{lang === "fr" ? sub.nameFr : sub.nameEn}</td>
                              <td className="p-2 text-stone-500">{lang === "fr" ? sub.conditionFr : sub.conditionEn}</td>
                              <td className="p-2 font-mono text-stone-500">{sub.markings || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
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
                )}
              </div>

              <div className="pt-6 border-t border-stone-200 mt-6 flex justify-between items-center">
                <span className="text-2xl font-mono font-bold text-stone-950">{selectedItem.price} €</span>
                {selectedItem.status === "available" ? (
                  <a
                    href={`mailto:votre-email@example.com?subject=Interet pour l'objet : ${selectedItem.title_fr}`}
                    className="bg-stone-900 text-white hover:bg-stone-800 py-2.5 px-6 tracking-wider uppercase text-xs font-semibold rounded-xs transition"
                  >
                    {lang === "fr" ? "Nous contacter" : "Contact us"}
                  </a>
                ) : (
                  <span className="text-stone-400 text-xs italic tracking-wider uppercase font-semibold">
                    {selectedItem.status === "sold" ? (lang === "fr" ? "Objet Vendu" : "Sold Item") : (lang === "fr" ? "Pièce Réservée" : "Reserved Item")}
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Pop-up pour les MENTIONS LÉGALES */}
      {showLegal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-2xl w-full p-8 rounded-sm border border-stone-200 shadow-2xl relative max-h-[80vh] overflow-y-auto">
            <button
              onClick={() => setShowLegal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-lg"
            >
              ✕
            </button>
            <h3 className="text-xl font-serif text-stone-900 mb-6 border-b pb-2 uppercase tracking-wide">
              {lang === "fr" ? "Mentions Légales & Réglementation" : "Legal Notices & Terms"}
            </h3>
            
            <div className="space-y-4 text-xs text-stone-600 leading-relaxed">
              <div>
                <h4 className="font-bold text-stone-800 uppercase mb-1">1. Édition du site</h4>
                <p>Le site <strong>CedMilitaria US</strong> est édité à titre individuel par un collectionneur et antiquaire indépendant d'objets historiques militaires. Pour toute demande ou question, vous pouvez nous contacter directement via l'adresse de contact présente sur le site.</p>
              </div>
              <div>
                <h4 className="font-bold text-stone-800 uppercase mb-1">2. Hébergement</h4>
                <p>Le site est hébergé par la société <strong>Vercel Inc.</strong>, située au 340 S Lemon Ave #4133 Walnut, CA 91789, USA. Les données de la galerie d'exposition sont stockées sur la plateforme sécurisée <strong>Supabase Inc.</strong>.</p>
              </div>
              <div>
                <h4 className="font-bold text-stone-800 uppercase mb-1">3. Nature de l'activité et transactions</h4>
                <p>CedMilitaria US est un site d'exposition d'antiquités militaires. Les transactions ne s'effectuent pas de manière automatisée sur ce site. Tout achat ou offre d'acquisition fait l'objet d'une mise en relation directe par email, et la vente est finalisée par des méthodes de paiement externes convenues d'un commun accord (PayPal, virement bancaire).</p>
              </div>
              <div>
                <h4 className="font-bold text-stone-800 uppercase mb-1">4. Réglementation sur les armes de collection</h4>
                <p>Les armes présentées sur ce site, le cas échéant, sont strictement classées en catégorie D (vente libre aux personnes majeures) et sont neutralisées conformément aux lois et réglementations en vigueur. Les numéros de certificats officiels de neutralisation sont mentionnés de manière explicite sur chaque fiche technique concernée.</p>
              </div>
              <div>
                <h4 className="font-bold text-stone-800 uppercase mb-1">5. Protection des données (RGPD)</h4>
                <p>Le site ne collecte aucun cookie publicitaire ni données personnelles à votre insu. Les seules informations reçues le sont par le biais de la prise de contact volontaire par email.</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowLegal(false)}
              className="mt-8 w-full bg-stone-900 hover:bg-stone-800 text-white text-xs py-2 uppercase tracking-wider font-semibold rounded-xs"
            >
              {lang === "fr" ? "Fermer les mentions" : "Close Notices"}
            </button>
          </div>
        </div>
      )}

      {/* Pied de page */}
      <footer className="bg-stone-950 text-stone-500 text-xs py-16 border-t border-stone-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div>
            <p className="font-serif text-stone-200 uppercase tracking-widest text-sm mb-1">CedMilitaria US</p>
            <p className="text-stone-600">{lang === "fr" ? "Achat, vente et expertise d'antiquités militaires historiques." : "Purchase, sale, and appraisal of historical military antiquities."}</p>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => setShowLegal(true)}
              className="text-stone-500 hover:text-stone-300 underline text-xs cursor-pointer bg-transparent border-0"
            >
              {lang === "fr" ? "Mentions Légales & Réglementation" : "Legal Notices & Regulation"}
            </button>
            <span className="text-stone-800">|</span>
            <p className="text-stone-700">
              © {new Date().getFullYear()} CedMilitaria US.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
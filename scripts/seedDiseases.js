/**
 * scripts/seedDiseases.js
 * Seeds the unified Diseases table with 20 common dermatological diseases.
 * Run with: node scripts/seedDiseases.js
 */
require("dotenv").config();
const { connectDB, sequelize } = require("../config/db");
require("../models"); // load all associations
const Disease = require("../models/Disease");

const diseases = [
  {
    name: "Acne Vulgaris",
    scientificName: "Acne vulgaris",
    category: "Inflammatory",
    severity: "Mild to Moderate",
    generalInfo: "A chronic inflammatory skin condition caused by the obstruction and infection of pilosebaceous units. Driven by excess sebum production, Cutibacterium acnes colonisation, follicular hyperkeratinisation and inflammation. Affects up to 85% of adolescents.",
    symptoms: ["Comedones (blackheads and whiteheads)", "Inflammatory papules and pustules", "Nodules and cysts in severe forms", "Post-inflammatory hyperpigmentation", "Scarring with repeated flares"],
    visualPatterns: "Open and closed comedones on the face, chest and back. Erythematous papules and pustules with occasional nodulo-cystic lesions in severe disease. Predominantly in sebaceous-rich areas.",
    treatments: ["Topical retinoids (tretinoin, adapalene)", "Topical antibiotics (clindamycin)", "Benzoyl peroxide", "Oral doxycycline or minocycline", "Isotretinoin for severe nodulo-cystic disease"],
    imageUrl: null,
  },
  {
    name: "Atopic Dermatitis",
    scientificName: "Dermatitis atopica",
    category: "Inflammatory",
    severity: "Moderate to Severe",
    generalInfo: "A chronic relapsing inflammatory skin disease associated with skin barrier dysfunction, IgE sensitisation and T-helper 2 (Th2)-skewed immune responses. Strongly associated with asthma, allergic rhinitis and food allergies.",
    symptoms: ["Intense pruritus (worse at night)", "Erythematous, oozing, crusted plaques", "Lichenification in chronic lesions", "Dry sensitive skin", "Flexural distribution in adults"],
    visualPatterns: "Infants: cheeks, scalp and extensor surfaces. Children and adults: flexural fossa (antecubital, popliteal), neck and hands. Diffuse xerosis with excoriations and lichenified plaques.",
    treatments: ["Emollients as cornerstone therapy", "Topical corticosteroids", "Topical calcineurin inhibitors (tacrolimus, pimecrolimus)", "Dupilumab (IL-4Rα antagonist)", "Oral antihistamines for itch"],
    imageUrl: null,
  },
  {
    name: "Psoriasis",
    scientificName: "Psoriasis vulgaris",
    category: "Autoimmune",
    severity: "Moderate to Severe",
    generalInfo: "A chronic systemic immune-mediated inflammatory disease primarily affecting the skin, with well-demarcated erythematous plaques covered by silvery scales. Associated with psoriatic arthritis, cardiovascular and metabolic comorbidities.",
    symptoms: ["Well-demarcated erythematous plaques with silvery scale", "Auspitz sign (pinpoint bleeding on scale removal)", "Nail pitting, onycholysis and subungual hyperkeratosis", "Pruritus and pain", "Joint pain in psoriatic arthritis"],
    visualPatterns: "Symmetrical plaques on elbows, knees, scalp and lumbosacral region. Guttate psoriasis presents as raindrop-shaped lesions post-streptococcal infection. Inverse psoriasis affects flexures without scale.",
    treatments: ["Topical corticosteroids and vitamin D analogues", "Methotrexate", "Cyclosporine", "Biologics (secukinumab, adalimumab, ustekinumab)", "Phototherapy (narrowband UVB)"],
    imageUrl: null,
  },
  {
    name: "Tinea Corporis",
    scientificName: "Tinea corporis",
    category: "Fungal",
    severity: "Mild",
    generalInfo: "A superficial dermatophyte infection of the glabrous skin caused by Trichophyton, Microsporum or Epidermophyton species. Transmitted by direct contact with infected humans, animals or soil.",
    symptoms: ["Ring-shaped erythematous scaly plaque", "Central clearing with advancing scaly border", "Pruritus", "Occasional vesicles at the active border", "Gradual expansion outward"],
    visualPatterns: "Annular erythematous lesion with a raised, scaly, well-defined border and central clearing. May be single or multiple. Common on trunk, extremities and face.",
    treatments: ["Topical clotrimazole or terbinafine for 2–4 weeks", "Topical ketoconazole", "Oral terbinafine or fluconazole for extensive or refractory disease", "Keep skin dry and clean"],
    imageUrl: null,
  },
  {
    name: "Melanoma",
    scientificName: "Melanoma malignum",
    category: "Neoplastic",
    severity: "Severe",
    generalInfo: "The most lethal form of skin cancer arising from malignant transformation of melanocytes. BRAF, NRAS and NF1 mutations are common. Early detection dramatically improves prognosis.",
    symptoms: ["Asymmetric pigmented lesion", "Irregular notched border", "Colour variation (brown, black, red, white, blue)", "Diameter > 6 mm", "Evolving change in size, shape or colour"],
    visualPatterns: "The ABCDE rule: Asymmetry, Border irregularity, Colour variation, Diameter > 6 mm, Evolution. Dermoscopy shows atypical pigment network, regression structures and vascular patterns.",
    treatments: ["Wide local excision with sentinel lymph node biopsy", "BRAF/MEK inhibitors (vemurafenib, dabrafenib/trametinib)", "Immune checkpoint inhibitors (pembrolizumab, ipilimumab + nivolumab)", "Adjuvant therapy for high-risk resected disease"],
    imageUrl: null,
  },
  {
    name: "Urticaria",
    scientificName: "Urticaria",
    category: "Inflammatory",
    severity: "Mild to Moderate",
    generalInfo: "An allergic or immune-mediated skin reaction causing transient wheals and flares, mediated by mast cell degranulation and histamine release. Acute (<6 weeks) vs chronic (>6 weeks). Triggers include foods, drugs, infections and physical stimuli.",
    symptoms: ["Raised, erythematous or pale wheals", "Intense pruritus", "Wheals resolve within 24 hours", "Angioedema (deeper swelling of lips, eyelids)", "Dermographism"],
    visualPatterns: "Erythematous or pale, oedematous, well-defined wheals varying from mm to cm. Polycyclic and serpiginous configurations. Individual lesions migrate and resolve within hours without scarring.",
    treatments: ["Non-sedating H1 antihistamines (cetirizine, fexofenadine)", "Higher dose antihistamines for chronic urticaria", "Omalizumab (anti-IgE) for refractory chronic spontaneous urticaria", "Short course oral corticosteroids for acute severe episodes", "Identify and avoid triggers"],
    imageUrl: null,
  },
  {
    name: "Cellulitis",
    scientificName: "Cellulitis",
    category: "Bacterial",
    severity: "Moderate",
    generalInfo: "An acute bacterial infection of the deep dermis and subcutaneous fat, most commonly caused by Streptococcus pyogenes and Staphylococcus aureus. Entry via skin breaks, tinea pedis or ulcers. Can progress to necrotising fasciitis if untreated.",
    symptoms: ["Rapidly spreading erythema, warmth and oedema", "Tenderness and pain", "Fever, chills and malaise", "Lymphangitis and regional lymphadenopathy", "Blistering in severe cases"],
    visualPatterns: "Diffuse, non-demarcated erythema with blurred borders, swelling and warmth. Typically unilateral on lower legs. Surface may show haemorrhagic bullae or purpura in severe MRSA infection.",
    treatments: ["Oral amoxicillin-clavulanate or cefalexin for mild–moderate disease", "IV penicillin or flucloxacillin for severe disease", "Doxycycline or co-trimoxazole if MRSA suspected", "Elevation of affected limb", "Treat underlying tinea pedis to prevent recurrence"],
    imageUrl: null,
  },
  {
    name: "Rosacea",
    scientificName: "Rosacea",
    category: "Inflammatory",
    severity: "Mild to Moderate",
    generalInfo: "A chronic facial inflammatory condition characterised by persistent central facial erythema, telangiectasias, inflammatory papules and pustules. Demodex mites, UV radiation and innate immune dysregulation contribute to pathogenesis.",
    symptoms: ["Persistent central facial erythema", "Flushing triggered by heat, alcohol or stress", "Inflammatory papules and pustules (no comedones)", "Telangiectasias on nose and cheeks", "Ocular symptoms (burning, gritty eyes)"],
    visualPatterns: "Central facial erythema predominantly over cheeks, nose, chin and forehead. Papulopustular variant resembles acne but lacks comedones. Phymatous rosacea causes nasal enlargement (rhinophyma) and skin thickening.",
    treatments: ["Topical metronidazole or azelaic acid", "Topical ivermectin 1% cream", "Oral doxycycline 40 mg (sub-antimicrobial dose)", "Laser or intense pulsed light for telangiectasias", "Sun protection and trigger avoidance"],
    imageUrl: null,
  },
  {
    name: "Seborrheic Dermatitis",
    scientificName: "Dermatitis seborrhoica",
    category: "Inflammatory",
    severity: "Mild",
    generalInfo: "A chronic relapsing inflammatory dermatosis of sebaceous-rich areas driven by Malassezia yeast overgrowth, altered sebum composition and immune dysregulation. More prevalent in immunosuppressed individuals and those with Parkinson's disease.",
    symptoms: ["Greasy yellowish scales on erythematous base", "Pruritus", "Involvement of scalp (dandruff), nasolabial folds and eyebrows", "Blepharitis", "Flares with stress and cold weather"],
    visualPatterns: "Greasy, yellowish, adherent scales on erythematous plaques in sebaceous areas: scalp, central face (nasolabial folds, glabella, eyebrows), chest and axillae. Cradle cap in neonates.",
    treatments: ["Antifungal shampoos (ketoconazole 2%, selenium sulfide)", "Topical corticosteroids for acute flares", "Topical calcineurin inhibitors for maintenance", "Coal tar preparations for scalp", "Zinc pyrithione shampoo for dandruff"],
    imageUrl: null,
  },
  {
    name: "Vitiligo",
    scientificName: "Vitiligo",
    category: "Autoimmune",
    severity: "Mild to Moderate",
    generalInfo: "A chronic autoimmune depigmenting disorder caused by selective destruction of melanocytes by autoreactive cytotoxic T-cells. Affects 0.5–2% of the global population. Associated with other autoimmune conditions (thyroid disease, type 1 diabetes).",
    symptoms: ["Well-defined chalk-white macules and patches", "Koebner phenomenon (lesions at sites of trauma)", "Hair depigmentation (leukotrichia)", "Periorbital and periorificial distribution common", "No pruritus or scaling"],
    visualPatterns: "Sharply demarcated achromic macules with a convex margin. Perifollicular repigmentation seen during treatment response. Wood's lamp accentuates lesions. Segmental vs non-segmental subtypes differ in distribution.",
    treatments: ["Topical corticosteroids (first-line for localised disease)", "Topical JAK inhibitors (ruxolitinib cream)", "Narrowband UVB phototherapy", "Oral mini-pulse corticosteroids to stabilise rapidly progressive disease", "Surgical: split-thickness grafting for stable segmental vitiligo"],
    imageUrl: null,
  },
  {
    name: "Alopecia Areata",
    scientificName: "Alopecia areata",
    category: "Autoimmune",
    severity: "Moderate",
    generalInfo: "A T-cell-mediated autoimmune disease causing non-scarring patchy hair loss. Loss of immune privilege at the hair follicle allows cytotoxic T-cells to attack anagen-phase follicles. Can progress to alopecia totalis or universalis.",
    symptoms: ["Sudden onset round or oval patches of hair loss", "Exclamation mark hairs at patch borders", "Nail pitting and trachyonychia", "No scarring or inflammation of scalp", "Can affect eyebrows, eyelashes and body hair"],
    visualPatterns: "Smooth, non-scarred patches of complete hair loss on scalp. Positive hair-pull test at active borders. Ophiasis pattern: band-like loss around the occipital and temporal scalp.",
    treatments: ["Intralesional triamcinolone acetonide (first-line for limited disease)", "Topical minoxidil 5% to stimulate regrowth", "Oral JAK inhibitors (baricitinib, ritlecitinib) for extensive disease", "Contact immunotherapy (DPCP) for chronic cases", "Systemic corticosteroids for rapid progression"],
    imageUrl: null,
  },
  {
    name: "Contact Dermatitis",
    scientificName: "Dermatitis contacta",
    category: "Inflammatory",
    severity: "Mild to Moderate",
    generalInfo: "An eczematous skin reaction due to direct contact with an external agent. Irritant contact dermatitis (non-immunological) is more common than allergic contact dermatitis (type IV delayed hypersensitivity). Common allergens include nickel, fragrances and preservatives.",
    symptoms: ["Pruritus and burning at contact site", "Erythema, vesiculation and oozing in acute phase", "Lichenification and scaling in chronic phase", "Well-defined borders matching area of contact", "Positive patch test in allergic type"],
    visualPatterns: "Sharply demarcated erythematous vesicular eruption conforming to the area of contact exposure. Chronic lesions show lichenification. Distribution provides clues to causative agent.",
    treatments: ["Identify and eliminate causative agent", "Topical corticosteroids", "Topical calcineurin inhibitors for facial or eyelid involvement", "Wet dressings for acute vesicular phase", "Systemic corticosteroids for severe widespread disease"],
    imageUrl: null,
  },
  {
    name: "Impetigo",
    scientificName: "Impetigo contagiosa",
    category: "Bacterial",
    severity: "Mild",
    generalInfo: "A highly contagious superficial bacterial skin infection primarily caused by Staphylococcus aureus and Streptococcus pyogenes. Predominantly affects children. Bullous impetigo is caused exclusively by S. aureus producing exfoliative toxins.",
    symptoms: ["Honey-coloured crusted erosions", "Bullae that rupture leaving moist eroded base (bullous type)", "Satellite lesions from autoinoculation", "Minimal systemic symptoms", "Regional lymphadenopathy"],
    visualPatterns: "Non-bullous type: golden-brown crusts on erythematous base around nose and mouth. Bullous type: flaccid clear or turbid bullae that rupture leaving a collarette of scale on an erythematous base.",
    treatments: ["Topical mupirocin 2% ointment for localised disease", "Topical fusidic acid", "Oral cefalexin or flucloxacillin for extensive disease", "MRSA: doxycycline or co-trimoxazole", "Gentle removal of crusts with soap and water"],
    imageUrl: null,
  },
  {
    name: "Scabies",
    scientificName: "Sarcoptes scabiei var. hominis",
    category: "Parasitic",
    severity: "Mild to Moderate",
    generalInfo: "A highly contagious parasitic infestation caused by the mite Sarcoptes scabiei. Transmitted by prolonged skin-to-skin contact. Intense nocturnal pruritus results from type IV hypersensitivity to mite proteins, eggs and faeces.",
    symptoms: ["Intense nocturnal pruritus", "Papules, vesicles and burrows in web spaces and wrists", "Nodular scabies on genitalia and axillae", "Excoriations and secondary bacterial infection", "Crusted (Norwegian) scabies in immunocompromised patients"],
    visualPatterns: "Pathognomonic linear or S-shaped burrows (3–10 mm) in finger web spaces, wrists, nipples and penis. Scattered erythematous papules, vesicles and excoriations. Dermoscopy shows jet with contrail sign.",
    treatments: ["Permethrin 5% cream (apply overnight, repeat after 1 week)", "Oral ivermectin 200 mcg/kg (two doses 1–2 weeks apart)", "Treat all household contacts simultaneously", "Launder clothing, bedding and towels at 60°C", "Topical corticosteroids for post-scabetic eczema"],
    imageUrl: null,
  },
  {
    name: "Herpes Zoster",
    scientificName: "Herpes zoster",
    category: "Viral",
    severity: "Moderate",
    generalInfo: "Reactivation of latent varicella-zoster virus (VZV) in dorsal root or cranial nerve ganglia. Results in painful unilateral dermatomal vesicular eruption. Risk increases with age and immunosuppression. Post-herpetic neuralgia is the most common complication.",
    symptoms: ["Prodromal dermatomal pain, burning or hyperaesthesia", "Unilateral vesicular rash on erythematous base", "Lesions limited to one or two adjacent dermatomes", "Fever and malaise", "Post-herpetic neuralgia after rash resolution"],
    visualPatterns: "Linear clusters of grouped vesicles on an erythematous base confined to a dermatome. T3–T10 thoracic dermatomes most common. Ophthalmic (V1) involvement may threaten vision (herpes zoster ophthalmicus).",
    treatments: ["Oral acyclovir 800 mg 5×/day for 7 days (within 72h of rash onset)", "Valacyclovir or famciclovir (better bioavailability)", "Gabapentin or pregabalin for post-herpetic neuralgia", "Zoster vaccine (recombinant, adjuvanted) for prevention", "Analgesics and topical lidocaine for pain management"],
    imageUrl: null,
  },
  {
    name: "Basal Cell Carcinoma",
    scientificName: "Carcinoma basocellulare",
    category: "Neoplastic",
    severity: "Moderate to Severe",
    generalInfo: "The most common skin cancer arising from basal keratinocytes, driven by cumulative UV radiation exposure and PTCH1/SMO mutations in the Hedgehog signalling pathway. Locally invasive but rarely metastasises.",
    symptoms: ["Pearlescent papule with rolled telangiectatic border", "Central ulceration (rodent ulcer)", "Bleeds easily with minor trauma", "Slow growth over months to years", "Painless until large"],
    visualPatterns: "Nodular type: translucent, pearly papule or nodule with arborising vessels on dermoscopy. Superficial type: erythematous, scaly plaque with thread-like borders. Morphoeic type: scar-like, white–yellow indurated plaque.",
    treatments: ["Surgical excision with clear margins (treatment of choice)", "Mohs micrographic surgery for high-risk or facial lesions", "Photodynamic therapy for superficial type", "Imiquimod 5% cream for superficial BCC", "Vismodegib (Hedgehog pathway inhibitor) for advanced or metastatic BCC"],
    imageUrl: null,
  },
  {
    name: "Squamous Cell Carcinoma",
    scientificName: "Carcinoma spinocellulare",
    category: "Neoplastic",
    severity: "Moderate to Severe",
    generalInfo: "A malignant epithelial tumour arising from keratinocytes, commonly on sun-damaged skin. Risk factors include UV exposure, HPV infection, immunosuppression and chronic wounds. Has metastatic potential, especially on the lips and ears.",
    symptoms: ["Firm, scaly or ulcerated nodule or plaque", "Bleeds and crusts with minimal trauma", "Induration and fixation to underlying structures in advanced disease", "Regional lymphadenopathy if metastasised", "Arises on background of actinic keratosis or Bowen's disease"],
    visualPatterns: "Erythematous, indurated, hyperkeratotic nodule or plaque with central ulceration and crusting. Surface may show keratin-filled crater (keratoacanthoma variant). On lips: persistent erosion or ulcer with rolled border.",
    treatments: ["Wide local excision with histological margin assessment", "Mohs surgery for high-risk sites", "Radiotherapy for inoperable disease or positive margins", "Cemiplimab (PD-1 inhibitor) for locally advanced or metastatic SCC", "Sentinel lymph node biopsy for high-risk tumours"],
    imageUrl: null,
  },
  {
    name: "Pemphigus Vulgaris",
    scientificName: "Pemphigus vulgaris",
    category: "Autoimmune",
    severity: "Severe",
    generalInfo: "A life-threatening autoimmune blistering disorder caused by IgG autoantibodies against desmoglein 3 (and desmoglein 1), leading to acantholysis and intraepidermal blistering. Involves mucous membranes in nearly all cases.",
    symptoms: ["Painful oral erosions (often first manifestation)", "Flaccid blisters that rupture easily leaving raw erosions", "Positive Nikolsky sign", "Extensive skin and mucosal involvement", "Pain on eating and swallowing"],
    visualPatterns: "Flaccid intraepidermal bullae that rupture rapidly, leaving painful erosions and crusts on normal-appearing or erythematous skin. Oral erosions are pathognomonic. Nikolsky sign positive.",
    treatments: ["High-dose systemic corticosteroids (prednisolone)", "Rituximab (anti-CD20) as steroid-sparing agent — first-line in many guidelines", "Azathioprine or mycophenolate mofetil as steroid-sparing", "IVIG for refractory disease", "Wound care and mucosal hygiene"],
    imageUrl: null,
  },
  {
    name: "Lichen Planus",
    scientificName: "Lichen planus",
    category: "Inflammatory",
    severity: "Moderate",
    generalInfo: "A T-lymphocyte-mediated inflammatory condition affecting the skin, mucous membranes, nails and hair follicles. Unknown trigger provokes cytotoxic CD8+ T-cell attack on basal keratinocytes. May be associated with hepatitis C infection.",
    symptoms: ["The 6 Ps: Pruritic, Purple, Planar, Polygonal, Papules on skin", "Wickham's striae (white network) on papule surface", "Mucosal involvement: reticular white lace-like pattern on buccal mucosa", "Nail involvement: pterygium, trachyonychia", "Post-inflammatory hyperpigmentation"],
    visualPatterns: "Violaceous, flat-topped, polygonal papules and plaques on wrists, ankles and lumbar region. Wickham's striae visible on dermoscopy. Oral variant shows bilateral white reticular or erosive pattern on buccal mucosa.",
    treatments: ["Topical corticosteroids (first-line for skin disease)", "Topical tacrolimus for mucosal and genital disease", "Narrowband UVB or PUVA for widespread cutaneous disease", "Systemic retinoids (acitretin) for hypertrophic or widespread disease", "Oral corticosteroids for acute flares"],
    imageUrl: null,
  },
  {
    name: "Pityriasis Rosea",
    scientificName: "Pityriasis rosea",
    category: "Viral",
    severity: "Mild",
    generalInfo: "A self-limiting papulosquamous dermatosis likely triggered by reactivation of human herpesvirus 6 or 7 (HHV-6/7). More common in young adults. Resolves spontaneously in 6–12 weeks. Associated with a prodrome of mild viral symptoms.",
    symptoms: ["Herald patch (solitary salmon-coloured oval plaque with collarette of scale) preceding generalised eruption by 1–2 weeks", "Christmas tree distribution on trunk following skin cleavage lines", "Mild pruritus", "Prodromal mild viral symptoms", "Spontaneous resolution in 6–12 weeks"],
    visualPatterns: "Secondary eruption of 5–20 mm oval erythematous plaques with inward-facing collarette of scale arranged along Langer's lines in a Christmas tree pattern on the trunk. Herald patch is larger and precedes generalised rash.",
    treatments: ["Reassurance — spontaneous resolution expected", "Oral antihistamines for pruritus", "Moderate-potency topical corticosteroids", "Narrowband UVB for severe pruritus", "Oral acyclovir may shorten duration in severe cases"],
    imageUrl: null,
  },
];

const seedDiseases = async () => {
  try {
    await connectDB();
    // No need to sync here — server startup already ran sync({ alter: true })
    // Running sync again causes FK issues when child tables have orphaned rows

    const result = await Disease.bulkCreate(diseases, {
      updateOnDuplicate: [
        "scientificName",
        "category",
        "severity",
        "generalInfo",
        "symptoms",
        "visualPatterns",
        "treatments",
        "imageUrl",
        "updatedAt",
      ],
    });

    console.log(`✅ Diseases seed complete: ${result.length} rows upserted (inserted or updated).`);
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error seeding diseases: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
};

seedDiseases();

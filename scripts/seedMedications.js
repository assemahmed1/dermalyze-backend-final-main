/**
 * scripts/seedMedications.js
 * Seeds the ClinicalMedications table with 30 common dermatology drugs.
 * Run with: node scripts/seedMedications.js
 */
require("dotenv").config();
const { connectDB, sequelize } = require("../config/db");
require("../models"); // load all associations
const ClinicalMedication = require("../models/ClinicalMedication");

const medications = [
  {
    name: "Clindamycin",
    category: "Antibiotic",
    description: "A lincosamide antibiotic used topically for acne vulgaris and other superficial bacterial skin infections. Inhibits bacterial protein synthesis by binding to the 50S ribosomal subunit.",
    uses: ["Acne vulgaris", "Bacterial skin infections", "Rosacea (off-label)"],
    sideEffects: ["Skin dryness and peeling", "Contact dermatitis", "Rarely: Clostridioides difficile colitis with oral use"],
    dosage: "Apply topically twice daily (1% gel or lotion); 150–300 mg orally every 6 hours for systemic infections",
  },
  {
    name: "Benzoyl Peroxide",
    category: "Keratolytic / Antibacterial",
    description: "A broad-spectrum antibacterial and keratolytic agent that releases free-radical oxygen to kill Cutibacterium acnes and reduce comedone formation.",
    uses: ["Acne vulgaris", "Superficial bacterial folliculitis"],
    sideEffects: ["Skin dryness and redness", "Peeling and desquamation", "Bleaching of hair and fabric", "Contact allergic dermatitis (rare)"],
    dosage: "Apply 2.5–10% gel or wash once or twice daily; start at lowest concentration",
  },
  {
    name: "Tretinoin",
    category: "Retinoid",
    description: "A first-generation retinoid (all-trans retinoic acid) that normalises follicular keratinisation, reduces comedone formation, and has anti-ageing properties by stimulating collagen synthesis.",
    uses: ["Acne vulgaris", "Photo-ageing", "Melasma (adjunct)", "Actinic keratosis"],
    sideEffects: ["Retinoid dermatitis (dryness, erythema, peeling)", "Photosensitivity", "Teratogenic — avoid in pregnancy"],
    dosage: "Apply 0.025–0.1% cream or gel at night; start at lowest concentration and titrate up",
  },
  {
    name: "Hydrocortisone",
    category: "Topical Corticosteroid (Class VII — mildest)",
    description: "A low-potency topical corticosteroid used for mild inflammatory skin conditions. Anti-inflammatory, anti-pruritic and vasoconstrictive properties.",
    uses: ["Mild eczema", "Seborrhoeic dermatitis", "Nappy rash", "Insect bite reactions", "Mild contact dermatitis"],
    sideEffects: ["Skin atrophy with prolonged use", "Striae", "Perioral dermatitis", "Tachyphylaxis"],
    dosage: "Apply 0.5–1% cream or ointment to affected area twice daily for up to 1–2 weeks",
  },
  {
    name: "Clotrimazole",
    category: "Antifungal",
    description: "A broad-spectrum imidazole antifungal that inhibits ergosterol synthesis in fungal cell membranes, effective against dermatophytes and Candida species.",
    uses: ["Tinea corporis, cruris and pedis", "Cutaneous candidiasis", "Tinea versicolor (off-label)", "Seborrhoeic dermatitis"],
    sideEffects: ["Mild burning or stinging on application", "Contact dermatitis (rare)", "Erythema"],
    dosage: "Apply 1% cream, solution or powder to affected area twice daily for 2–4 weeks",
  },
  {
    name: "Mupirocin",
    category: "Topical Antibiotic",
    description: "A pseudomonic acid antibiotic that inhibits bacterial isoleucyl-tRNA synthetase. Active against Staphylococcus aureus (including MRSA) and Streptococcus pyogenes.",
    uses: ["Impetigo", "Secondary infected eczema", "Nasal decolonisation of MRSA", "Minor wound infections"],
    sideEffects: ["Local burning or stinging", "Contact dermatitis", "Emerging mupirocin resistance with prolonged use"],
    dosage: "Apply 2% ointment to affected area three times daily for 5–10 days",
  },
  {
    name: "Metronidazole",
    category: "Antibiotic / Antiparasitic",
    description: "A nitroimidazole antibiotic with anti-inflammatory and antimicrobial properties. Topically used for rosacea; orally for anaerobic infections.",
    uses: ["Rosacea", "Perioral dermatitis", "Gram-negative folliculitis"],
    sideEffects: ["Topical: dryness, stinging", "Oral: nausea, metallic taste, peripheral neuropathy with prolonged use", "Disulfiram-like reaction with alcohol"],
    dosage: "Apply 0.75–1% cream or gel twice daily; 200–400 mg orally twice daily for systemic indications",
  },
  {
    name: "Tacrolimus",
    category: "Topical Calcineurin Inhibitor",
    description: "A macrolide calcineurin inhibitor that blocks T-lymphocyte activation and cytokine production without causing skin atrophy, making it suitable for sensitive areas.",
    uses: ["Atopic dermatitis (moderate to severe)", "Vitiligo (off-label)", "Lichen planus", "Seborrhoeic dermatitis on face"],
    sideEffects: ["Transient burning and pruritus", "Herpes simplex reactivation", "Theoretical lymphoma risk (black-box warning — not confirmed)"],
    dosage: "Apply 0.03% (children) or 0.1% (adults) ointment twice daily; reduce to once daily when controlled",
  },
  {
    name: "Adapalene",
    category: "Retinoid",
    description: "A third-generation synthetic retinoid with selective affinity for RAR-β and RAR-γ receptors. Less irritating than tretinoin while maintaining comparable efficacy for acne.",
    uses: ["Acne vulgaris", "Comedonal acne", "Post-acne hyperpigmentation (adjunct)"],
    sideEffects: ["Dryness and mild irritation", "Photosensitivity", "Initial acne flare (purging)", "Teratogenic — avoid in pregnancy"],
    dosage: "Apply 0.1% or 0.3% gel to affected area once daily at night",
  },
  {
    name: "Salicylic Acid",
    category: "Keratolytic",
    description: "A beta-hydroxy acid (BHA) that causes desquamation of the stratum corneum by dissolving intercellular cement, reducing hyperkeratosis and comedone formation.",
    uses: ["Acne vulgaris", "Seborrhoeic dermatitis", "Psoriasis", "Warts and corns", "Dandruff"],
    sideEffects: ["Skin dryness and peeling", "Salicylism (toxicity) if applied over large surface areas", "Burning sensation"],
    dosage: "Apply 0.5–2% for acne; 3–6% for psoriasis and hyperkeratotic conditions; up to 40% for warts (under occlusion)",
  },
  {
    name: "Ketoconazole",
    category: "Antifungal",
    description: "A broad-spectrum imidazole antifungal active against dermatophytes, yeasts (including Malassezia) and dimorphic fungi. Available topically and systemically.",
    uses: ["Seborrhoeic dermatitis", "Tinea versicolor", "Tinea corporis and pedis", "Cutaneous candidiasis"],
    sideEffects: ["Topical: local irritation", "Oral: hepatotoxicity (LFT monitoring required), drug interactions via CYP3A4 inhibition"],
    dosage: "Apply 2% shampoo or cream once to twice daily; 200–400 mg orally once daily for systemic disease",
  },
  {
    name: "Fluconazole",
    category: "Antifungal (Systemic)",
    description: "A triazole antifungal that inhibits fungal CYP51 enzyme (lanosterol 14α-demethylase), disrupting ergosterol synthesis. Excellent oral bioavailability.",
    uses: ["Onychomycosis", "Tinea capitis", "Mucocutaneous candidiasis", "Systemic fungal infections"],
    sideEffects: ["Nausea and abdominal discomfort", "Hepatotoxicity", "QT prolongation", "Multiple drug interactions"],
    dosage: "150–300 mg once weekly for onychomycosis (6–12 months for toenails); 50–200 mg daily for cutaneous candidiasis",
  },
  {
    name: "Doxycycline",
    category: "Antibiotic (Tetracycline)",
    description: "A broad-spectrum bacteriostatic tetracycline antibiotic with additional anti-inflammatory properties. Inhibits matrix metalloproteinase activity relevant to rosacea and acne.",
    uses: ["Acne vulgaris (moderate to severe)", "Rosacea", "Lyme disease", "Cellulitis", "Perioral dermatitis"],
    sideEffects: ["Photosensitivity (use sunscreen)", "Oesophageal irritation — take upright with water", "GI upset", "Teratogenic — avoid in pregnancy and children < 8 years"],
    dosage: "100 mg twice daily for acne/infections; 40 mg modified-release once daily for rosacea",
  },
  {
    name: "Minocycline",
    category: "Antibiotic (Tetracycline)",
    description: "A tetracycline antibiotic with broader lipophilicity, achieving high concentrations in sebaceous glands. Useful for acne resistant to other tetracyclines.",
    uses: ["Acne vulgaris", "Rosacea", "MRSA decolonisation (adjunct)"],
    sideEffects: ["Vestibular disturbance (dizziness)", "Blue-grey pigmentation with prolonged use", "Drug-induced lupus", "Photosensitivity less than doxycycline"],
    dosage: "50–100 mg twice daily; extended-release 45–135 mg once daily",
  },
  {
    name: "Azithromycin",
    category: "Antibiotic (Macrolide)",
    description: "A macrolide antibiotic that inhibits bacterial protein synthesis and has anti-inflammatory properties. Used as second-line for acne in patients intolerant to tetracyclines.",
    uses: ["Acne vulgaris (second-line)", "Erythrasma", "Pityriasis lichenoides", "Impetigo (alternative)"],
    sideEffects: ["GI upset (nausea, diarrhoea)", "QT prolongation", "Hepatotoxicity (rare)", "Drug interactions"],
    dosage: "500 mg once daily for 3 days per week (pulse dosing) for acne; 500 mg once daily for 3 days for acute infections",
  },
  {
    name: "Betamethasone",
    category: "Topical Corticosteroid (Class III — potent)",
    description: "A potent synthetic glucocorticoid used topically and systemically. Available in several formulations including valerate (class III) and dipropionate (class I–II).",
    uses: ["Moderate to severe eczema", "Psoriasis", "Lichen planus", "Allergic contact dermatitis", "Alopecia areata (as scalp lotion)"],
    sideEffects: ["Skin atrophy", "Striae", "Telangiectasias", "Hypothalamic-pituitary-adrenal (HPA) suppression", "Perioral dermatitis"],
    dosage: "Apply betamethasone valerate 0.1% cream or ointment once to twice daily; limit use on face and flexures",
  },
  {
    name: "Clobetasol",
    category: "Topical Corticosteroid (Class I — super-potent)",
    description: "The most potent class of topical corticosteroid. Reserved for severe, recalcitrant inflammatory dermatoses. Restrict use to 2 consecutive weeks maximum.",
    uses: ["Severe psoriasis", "Lichen planus (hypertrophic)", "Pemphigus (localised)", "Lichen sclerosus", "Severe contact dermatitis"],
    sideEffects: ["Severe skin atrophy", "Striae", "Systemic absorption and HPA suppression", "Telangiectasias", "Rebound flare on withdrawal"],
    dosage: "Apply 0.05% cream or ointment once to twice daily for maximum 2 weeks; limit to < 50 g/week",
  },
  {
    name: "Terbinafine",
    category: "Antifungal (Allylamine)",
    description: "An allylamine antifungal that inhibits squalene epoxidase, causing squalene accumulation and ergosterol depletion. Fungicidal against dermatophytes.",
    uses: ["Onychomycosis", "Tinea pedis", "Tinea corporis and cruris", "Tinea capitis"],
    sideEffects: ["Oral: headache, GI upset, taste disturbance, hepatotoxicity (rare)", "Topical: mild irritation", "Drug interactions (CYP2D6 inhibitor)"],
    dosage: "Apply 1% cream once to twice daily for 1–4 weeks (tinea); 250 mg orally once daily for 6 weeks (fingernails) or 12 weeks (toenails)",
  },
  {
    name: "Acyclovir",
    category: "Antiviral",
    description: "A nucleoside analogue that is phosphorylated by viral thymidine kinase to inhibit herpes virus DNA polymerase. Active against HSV-1, HSV-2 and VZV.",
    uses: ["Herpes simplex labialis", "Genital herpes (HSV-2)", "Herpes zoster", "Eczema herpeticum", "Varicella (chickenpox)"],
    sideEffects: ["Topical: mild stinging", "Oral: headache, nausea", "IV: nephrotoxicity, neurotoxicity (ensure adequate hydration)"],
    dosage: "Apply 5% cream 5× daily for 5 days (HSV); 400 mg orally 5× daily for 7–10 days (HSV); 800 mg orally 5× daily for 7 days (zoster)",
  },
  {
    name: "Isotretinoin",
    category: "Systemic Retinoid",
    description: "A 13-cis-retinoic acid derivative that reduces sebaceous gland size and sebum production by up to 90%, normalises follicular keratinisation and has anti-inflammatory effects. Curative for severe acne.",
    uses: ["Severe nodulo-cystic acne", "Acne unresponsive to antibiotics", "Acne fulminans", "Gram-negative folliculitis"],
    sideEffects: ["Highly teratogenic (mandatory pregnancy prevention programme)", "Cheilitis and xerosis", "Elevated triglycerides and LFTs", "Myalgia", "Mood changes"],
    dosage: "0.5–1 mg/kg/day orally with food; cumulative target dose 120–150 mg/kg",
  },
  {
    name: "Azelaic Acid",
    category: "Dicarboxylic Acid",
    description: "A naturally occurring dicarboxylic acid with antibacterial, keratolytic and anti-inflammatory properties. Also inhibits tyrosinase, making it useful for hyperpigmentation.",
    uses: ["Acne vulgaris", "Rosacea (papulopustular type)", "Post-inflammatory hyperpigmentation", "Melasma"],
    sideEffects: ["Transient stinging and erythema on application", "Mild desquamation", "Safe in pregnancy (category B)"],
    dosage: "Apply 15–20% gel or cream twice daily; 15% gel licensed for rosacea in many countries",
  },
  {
    name: "Niacinamide",
    category: "Vitamin / Anti-inflammatory",
    description: "The amide form of vitamin B3. Anti-inflammatory through inhibition of TNF-α and IL-1β production. Reduces sebum production, brightens skin and improves barrier function.",
    uses: ["Acne vulgaris", "Rosacea", "Hyperpigmentation", "Skin barrier repair"],
    sideEffects: ["Generally well tolerated", "Occasional mild erythema or stinging at high concentrations"],
    dosage: "Apply 4–5% topical formulation twice daily",
  },
  {
    name: "Ivermectin",
    category: "Antiparasitic",
    description: "A macrocyclic lactone that kills parasites by hyperpolarisation of neuronal and muscle cells through glutamate-gated chloride channels. Also has anti-inflammatory effects relevant to rosacea.",
    uses: ["Papulopustular rosacea (1% cream)", "Scabies (oral)", "Head lice (lotion)", "Crusted (Norwegian) scabies"],
    sideEffects: ["Topical: mild skin irritation", "Oral: headache, dizziness, GI upset", "Mazzotti reaction if used in onchocerciasis"],
    dosage: "Apply 1% cream once daily for 16 weeks (rosacea); 200 mcg/kg orally (scabies — two doses 1–2 weeks apart)",
  },
  {
    name: "Permethrin",
    category: "Antiparasitic",
    description: "A synthetic pyrethroid that disrupts sodium channel function in arthropod nerve cell membranes, causing paralysis and death of parasites. First-line topical treatment for scabies and head lice.",
    uses: ["Scabies", "Head lice (pediculosis capitis)", "Crab lice (pediculosis pubis)"],
    sideEffects: ["Skin burning, stinging and pruritus", "Erythema on application", "Post-scabetic itch may persist for 2–4 weeks after successful treatment"],
    dosage: "Apply 5% cream to whole body from neck down, leave for 8–12 hours, wash off; repeat after 1 week",
  },
  {
    name: "Coal Tar",
    category: "Keratoplastic",
    description: "A complex mixture of hydrocarbons derived from coal distillation. Antiproliferative, anti-inflammatory, keratolytic and antipruritic. Exact mechanism incompletely understood — likely involves AhR activation.",
    uses: ["Psoriasis", "Seborrhoeic dermatitis", "Chronic eczema", "Dandruff"],
    sideEffects: ["Strong odour", "Skin staining (clothes and bath)", "Photosensitivity (avoid sun after application)", "Folliculitis", "Theoretical carcinogenicity with prolonged high-dose use"],
    dosage: "Apply 1–10% preparations to affected areas; 2–5% shampoo for scalp psoriasis and seborrhoeic dermatitis",
  },
  {
    name: "Anthralin",
    category: "Antipsoriatic",
    description: "A synthetic dithranol derivative that inhibits mitochondrial function and DNA synthesis in hyperproliferating keratinocytes. Used for stable plaque psoriasis.",
    uses: ["Chronic plaque psoriasis", "Alopecia areata (off-label, contact immunotherapy adjunct)"],
    sideEffects: ["Skin staining (brown/purple)", "Perilesional irritation and erythema", "Avoid normal skin and mucosal surfaces"],
    dosage: "Short-contact therapy: 1–2% cream applied for 20–30 minutes once daily, increasing strength gradually; start at 0.1%",
  },
  {
    name: "Cyclosporine",
    category: "Immunosuppressant (Calcineurin Inhibitor)",
    description: "A cyclic peptide calcineurin inhibitor that suppresses T-cell activation by blocking IL-2 transcription. Rapid onset of action for inflammatory dermatoses.",
    uses: ["Severe atopic dermatitis", "Psoriasis", "Chronic urticaria (refractory)", "Pemphigus vulgaris (steroid-sparing)"],
    sideEffects: ["Nephrotoxicity (dose-dependent, reversible)", "Hypertension", "Hypertrichosis", "Gingival hyperplasia", "Increased infection risk", "Drug interactions"],
    dosage: "2.5–5 mg/kg/day orally in two divided doses; monitor renal function and blood pressure regularly; limit to 1–2 years",
  },
  {
    name: "Methotrexate",
    category: "Antimetabolite / Immunosuppressant",
    description: "A folate antagonist that inhibits dihydrofolate reductase, reducing nucleotide synthesis in rapidly dividing cells. Anti-inflammatory via adenosine-mediated mechanisms.",
    uses: ["Psoriasis (moderate to severe)", "Psoriatic arthritis", "Atopic dermatitis (refractory)", "Pemphigus vulgaris (steroid-sparing)", "Mycosis fungoides"],
    sideEffects: ["Hepatotoxicity (liver biopsy or FibroScan monitoring)", "Bone marrow suppression", "Teratogenic — contraception essential", "Nausea (take folic acid 5 mg/week)"],
    dosage: "7.5–25 mg once weekly; supplemented with folic acid 5 mg once weekly (24–48 hours after MTX)",
  },
  {
    name: "Dupilumab",
    category: "Biologic (IL-4Rα Antagonist)",
    description: "A fully human monoclonal antibody targeting the IL-4Rα subunit, blocking signalling of both IL-4 and IL-13 — key drivers of type 2 inflammation in atopic dermatitis and other Th2-mediated conditions.",
    uses: ["Moderate to severe atopic dermatitis", "Asthma", "Chronic rhinosinusitis with nasal polyposis", "Prurigo nodularis"],
    sideEffects: ["Injection site reactions", "Conjunctivitis (5–10%)", "Facial erythema", "Nasopharyngitis"],
    dosage: "600 mg SC loading dose (two 300 mg injections), then 300 mg SC every 2 weeks; may extend to every 4 weeks in moderate disease",
  },
  {
    name: "Secukinumab",
    category: "Biologic (IL-17A Antagonist)",
    description: "A fully human IgG1κ monoclonal antibody that selectively neutralises IL-17A, a pro-inflammatory cytokine central to psoriasis pathogenesis and neutrophil recruitment.",
    uses: ["Plaque psoriasis (moderate to severe)", "Psoriatic arthritis", "Ankylosing spondylitis"],
    sideEffects: ["Injection site reactions", "Upper respiratory infections", "Candida infections (risk of mucocutaneous candidiasis)", "Inflammatory bowel disease exacerbation"],
    dosage: "300 mg SC weekly for 5 doses (induction), then 300 mg SC every 4 weeks (maintenance); 150 mg dose for some patients",
  },
];

const seedMedications = async () => {
  try {
    await connectDB();
    await sequelize.sync({ alter: true });

    let inserted = 0;
    let updated = 0;

    for (const m of medications) {
      const [record, created] = await ClinicalMedication.findOrCreate({
        where: { name: m.name },
        defaults: m,
      });

      if (!created) {
        await record.update(m);
        updated++;
      } else {
        inserted++;
      }
    }

    console.log(`✅ Medications seed complete: ${inserted} inserted, ${updated} updated. Total: ${medications.length}.`);
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error seeding medications: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
};

seedMedications();

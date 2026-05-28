// scripts/uploadDiseaseImages.js
// For every disease still missing an imageUrl:
//   1. Try Wikipedia MediaWiki API (pageimages) for the disease name
//   2. Fall back to Wikimedia Commons search
//   3. Download image bytes locally (avoids Wikimedia 429-ing Cloudinary's fetcher)
//   4. Upload buffer to Cloudinary
//   5. Save secure_url back to DB

'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const https    = require('https');
const http     = require('http');
const cloudinary = require('../config/cloudinary');
const { sequelize } = require('../config/db');

// ---------------------------------------------------------------------------
// Wikipedia article title overrides (db name → Wikipedia article title)
// ---------------------------------------------------------------------------
const WIKI_OVERRIDES = {
  'Acne Vulgaris':                  'Acne',
  'Atopic Dermatitis':              'Atopic dermatitis',
  'Tinea Corporis':                 'Tinea corporis',
  'Tinea Pedis':                    "Athlete's foot",
  'Tinea Versicolor':               'Tinea versicolor',
  'Onychomycosis':                  'Onychomycosis',
  'Cutaneous Candidiasis':          'Candidal intertrigo',
  'Herpes Zoster':                  'Shingles',
  'Herpes Simplex':                 'Herpes simplex',
  'Verruca Vulgaris':               'Wart',
  'Molluscum Contagiosum':          'Molluscum contagiosum',
  'Hand Foot and Mouth Disease':    'Hand, foot, and mouth disease',
  'Varicella':                      'Chickenpox',
  'Basal Cell Carcinoma':           'Basal-cell carcinoma',
  'Squamous Cell Carcinoma':        'Squamous-cell carcinoma of the skin',
  'Pemphigus Vulgaris':             'Pemphigus vulgaris',
  'Bullous Pemphigoid':             'Bullous pemphigoid',
  'Dermatitis Herpetiformis':       'Dermatitis herpetiformis',
  'Cutaneous Lupus Erythematosus':  'Cutaneous lupus erythematosus',
  "Stevens-Johnson Syndrome":       'Stevens–Johnson syndrome',
  'Erythema Multiforme':            'Erythema multiforme',
  'Drug Reaction with Eosinophilia and Systemic Symptoms': 'Drug reaction with eosinophilia and systemic symptoms',
  'Toxic Epidermal Necrolysis':     'Toxic epidermal necrolysis',
  'Fixed Drug Eruption':            'Fixed drug reaction',
  'Lichen Sclerosus':               'Lichen sclerosus',
  'Lichen Simplex Chronicus':       'Lichen simplex chronicus',
  'Dyshidrotic Eczema':             'Dyshidrosis',
  'Nummular Dermatitis':            'Nummular eczema',
  'Stasis Dermatitis':              'Stasis dermatitis',
  'Perioral Dermatitis':            'Perioral dermatitis',
  'Cutaneous Leishmaniasis':        'Cutaneous leishmaniasis',
  'Cutaneous Larva Migrans':        'Cutaneous larva migrans',
  'Pediculosis Capitis':            'Head louse',
  'Tinea Capitis':                  'Tinea capitis',
  'Tinea Cruris':                   'Jock itch',
  "Bowen's Disease":                "Bowen's disease",
  'Mycosis Fungoides':              'Mycosis fungoides',
  'Sezary Syndrome':                'Sézary disease',
  'Seborrheic Keratosis':           'Seborrheic keratosis',
  'Actinic Keratosis':              'Actinic keratosis',
  'Merkel Cell Carcinoma':          'Merkel-cell carcinoma',
  'Dermatofibrosarcoma Protuberans':'Dermatofibrosarcoma protuberans',
  'Primary Cutaneous B-Cell Lymphoma': 'Primary cutaneous B-cell lymphoma',
  'Kaposi Sarcoma':                 "Kaposi's sarcoma",
  'Pityriasis Rosea':               'Pityriasis rosea',
  'Pityriasis Alba':                'Pityriasis alba',
  'Pityriasis Rubra Pilaris':       'Pityriasis rubra pilaris',
  'Pityriasis Lichenoides':         'Pityriasis lichenoides et varioliformis acuta',
  'Palmoplantar Pustulosis':        'Palmoplantar pustulosis',
  'Guttate Psoriasis':              'Psoriasis',
  'Inverse Psoriasis':              'Psoriasis',
  'Reactive Arthritis':             'Reactive arthritis',
  'Sweet Syndrome':                 "Sweet's syndrome",
  'Pyoderma Gangrenosum':           'Pyoderma gangrenosum',
  'Cutaneous Vasculitis':           'Leukocytoclastic vasculitis',
  'Ichthyosis Vulgaris':            'Ichthyosis vulgaris',
  'Lamellar Ichthyosis':            'Lamellar ichthyosis',
  'Epidermolysis Bullosa':          'Epidermolysis bullosa',
  'Keratosis Pilaris':              'Keratosis pilaris',
  'Granuloma Annulare':             'Granuloma annulare',
  'Necrobiosis Lipoidica':          'Necrobiosis lipoidica',
  'Erythema Nodosum':               'Erythema nodosum',
  'Lichen Nitidus':                 'Lichen nitidus',
  'Lichen Striatus':                'Lichen striatus',
  'Cutaneous Amyloidosis':          'Cutaneous amyloidosis',
  'Livedo Reticularis':             'Livedo reticularis',
  'Urticaria Pigmentosa':           'Cutaneous mastocytosis',
  'Tuberous Sclerosis':             'Tuberous sclerosis complex',
  'Neurofibromatosis Type 1':       'Neurofibromatosis type I',
  'Hailey-Hailey Disease':          'Hailey–Hailey disease',
  'Darier Disease':                 'Darier disease',
  'Hidradenitis Suppurativa':       'Hidradenitis suppurativa',
  'Prurigo Nodularis':              'Prurigo nodularis',
  'Acanthosis Nigricans':           'Acanthosis nigricans',
  'Cutaneous Horn':                 'Cutaneous horn',
  'Sebaceous Hyperplasia':          'Sebaceous hyperplasia',
  'Confluent and Reticulated Papillomatosis': 'Confluent and reticulated papillomatosis',
  'Nevus Sebaceus':                 'Sebaceous nevus',
  'Melanocytic Nevus':              'Melanocytic nevus',
  'Epidermoid Cyst':                'Epidermoid cyst',
  'Cutaneous Sarcoidosis':          'Sarcoidosis',
  'Secondary Syphilis':             'Syphilis',
  'Lyme Disease':                   'Lyme disease',
  'Meningococcemia':                'Meningococcal disease',
  'Pseudofolliculitis Barbae':      'Pseudofolliculitis barbae',
  'Acne Keloidalis Nuchae':         'Acne keloidalis nuchae',
  'Dissecting Cellulitis of Scalp': 'Dissecting cellulitis of the scalp',
  'Photodermatitis':                'Photodermatitis',
  'Occupational Dermatitis':        'Occupational contact dermatitis',
  'Venous Leg Ulcer':               'Venous ulcer',
  'Arterial Leg Ulcer':             'Peripheral artery disease',
  'Diabetic Foot Ulcer':            'Diabetic foot',
  'Pressure Ulcer':                 'Pressure ulcer',
  'Lipodermatosclerosis':           'Lipodermatosclerosis',
  'Subcutaneous Fat Necrosis of Newborn': 'Subcutaneous fat necrosis of the newborn',
  'Aplasia Cutis Congenita':        'Aplasia cutis congenita',
  'Perforating Dermatosis':         'Perforating dermatosis',
  'Reactive Perforating Collagenosis': 'Reactive perforating collagenosis',
  'Orf':                            'Orf (disease)',
  'Halo Nevus':                     'Halo nevus',
  'Connective Tissue Nevus':        'Connective tissue nevus',
  'Eosinophilic Fasciitis':         'Eosinophilic fasciitis',
  'Fox-Fordyce Disease':            'Fox–Fordyce disease',
  'Psoriatic Arthritis Skin Manifestations': 'Psoriatic arthritis',
  'Miliaria':                       'Miliaria',
  'Erythrasma':                     'Erythrasma',
  'Pitted Keratolysis':             'Pitted keratolysis',
  'Ecthyma':                        'Ecthyma',
  'Sporotrichosis':                 'Sporotrichosis',
  'Dermatofibrosarcoma Protuberans': 'Dermatofibrosarcoma protuberans',
  'Melanocytic Nevus':              'Melanocytic nevus',
  'Hyperhidrosis':                  'Hyperhidrosis',
  'Chilblains':                     'Pernio',
  'Rhinophyma':                     'Rhinophyma',
  'Sebaceous Hyperplasia':          'Sebaceous hyperplasia',
  'Miliaria Crystallina':           'Miliaria',
  'Lichen Striatus':                'Lichen striatus',
  'Pseudofolliculitis Barbae':      'Pseudofolliculitis barbae',
  'Urticaria Pigmentosa':           'Urticaria pigmentosa',
  'Calcinosis Cutis':               'Calcinosis cutis',
  'Xanthoma':                       'Xanthoma',
  'Porokeratosis':                  'Porokeratosis',
  'Cutaneous Amyloidosis':          'Cutaneous amyloidosis',
  'Ichthyosis Vulgaris':            'Ichthyosis vulgaris',
  'Cutaneous Vasculitis':           'Leukocytoclastic vasculitis',
  'Necrobiosis Lipoidica':          'Necrobiosis lipoidica',
  'Pediculosis Capitis':            'Pediculosis capitis',
  'Cutaneous Larva Migrans':        'Cutaneous larva migrans',
  'Pityriasis Lichenoides':         'Pityriasis lichenoides',
  'Angular Cheilitis':              'Angular cheilitis',
  'Lichen Simplex Chronicus':       'Lichen simplex chronicus',
  'Palmoplantar Pustulosis':        'Palmoplantar pustulosis',
  'Alopecia Areata':                'Alopecia areata',
  'Contact Dermatitis':             'Contact dermatitis',
  'Seborrheic Dermatitis':          'Seborrhoeic dermatitis',
  'Tinea Versicolor':               'Tinea versicolor',
  'Erythema Nodosum':               'Erythema nodosum',
  'Dermatomyositis':                'Dermatomyositis',
  'Morphea':                        'Morphea',
  'Lichen Planus':                  'Lichen planus',
  'Pityriasis Rosea':               'Pityriasis rosea',
  'Leprosy':                        'Leprosy',
  'Tuberous Sclerosis':             'Tuberous sclerosis complex',
  'Neurofibromatosis Type 1':       'Neurofibromatosis type 1',
  'Darier Disease':                 'Darier disease',
  'Hailey-Hailey Disease':          'Hailey–Hailey disease',
  'Lamellar Ichthyosis':            'Lamellar ichthyosis',
  'Epidermolysis Bullosa':          'Epidermolysis bullosa',
  'Chromoblastomycosis':            'Chromoblastomycosis',
  'Trichoepithelioma':              'Trichoepithelioma',
  'Syringoma':                      'Syringoma',
  'Pilomatricoma':                  'Pilomatrixoma',
  'Angiosarcoma':                   'Angiosarcoma',
  'Dissecting Cellulitis of Scalp': 'Dissecting cellulitis of the scalp',
  'Acne Keloidalis Nuchae':         'Acne keloidalis nuchae',
  'Erythroderma':                   'Erythroderma',
  'Fox-Fordyce Disease':            'Fox–Fordyce disease',
  'Fixed Drug Eruption':            'Fixed drug eruption',
  'Livedo Reticularis':             'Livedo reticularis',
  'Elastosis Perforans Serpiginosa': 'Elastosis perforans serpiginosa',
  'Dermatomyositis':                'Dermatomyositis',
  'Cutaneous Horn':                 'Cutaneous horn',
  'Lichen Nitidus':                 'Lichen nitidus',
  'Pityriasis Alba':                'Pityriasis alba',
  'Keloid':                         'Keloid',
  'Milia':                          'Milium (dermatology)',
  'Dermatofibroma':                 'Dermatofibroma',
  'Lipoma':                         'Lipoma',
  'Epidermoid Cyst':                'Epidermoid cyst',
  'Seborrheic Keratosis':           'Seborrheic keratosis',
  'Acanthosis Nigricans':           'Acanthosis nigricans',
  'Mycetoma':                       'Mycetoma',
  'Orf':                            'Orf (disease)',
  'Halo Nevus':                     'Halo nevus',
  'Meningococcemia':                'Meningococcal disease',

  'Solar Lentigines':               'Solar lentigo',
  'Idiopathic Guttate Hypomelanosis':'Guttate hypomelanosis',
  'Androgenetic Alopecia':           'Androgenetic alopecia',
  'Telogen Effluvium':               'Telogen effluvium',
  'Malassezia Folliculitis':         'Malassezia folliculitis',
  'Acne Conglobata':                 'Acne conglobata',
  'Steroid Acne':                    'Steroid acne',
  'Gram-negative Folliculitis':       'Folliculitis',
  'Carbuncle':                       'Carbuncle (medicine)',
  'Post-inflammatory Hyperpigmentation': 'Post-inflammatory hyperpigmentation',
  'Perianal Streptococcal Dermatitis':'Perianal streptococcal disease',
  'Hand Eczema':                     'Hand eczema',
  'Asteatotic Eczema':               'Eczema craquelé',
  'Intertrigo':                      'Intertrigo',
  'Diaper Dermatitis':               'Diaper rash',
  'Eyelid Dermatitis':               'Contact dermatitis',
  'Irritant Contact Dermatitis':     'Irritant contact dermatitis',
  'Allergic Contact Dermatitis':     'Allergic contact dermatitis',
  'Chronic Spontaneous Urticaria':   'Chronic urticaria',
  'Cholinergic Urticaria':           'Cholinergic urticaria',
  'Cold Urticaria':                  'Cold urticaria',
  'Serum Sickness-like Reaction':    'Serum sickness',
  'Diabetic Dermopathy':             'Diabetic dermopathy',
  'Aquagenic Pruritus':              'Aquagenic pruritus',
  'Corns and Calluses':              'Corn (medicine)',
  'Ingrown Toenail':                 'Ingrown toenail',
  'Longitudinal Melanonychia':       'Melanonychia',
  'Onychogryposis':                  'Onychogryphosis',
  'Alopecia Totalis':                'Alopecia totalis',
  'Lymphangioma Circumscriptum':     'Lymphangioma circumscriptum',
  'Acne Excoriée':                   'Acne excoriée',
  'Pityriasis Amiantacea':           'Pityriasis amiantacea',
  'Lichen Planus Pigmentosus':       'Lichen planus pigmentosus',
  'Black Hairy Tongue':              'Black hairy tongue',
  'Varicose Eczema':                 'Stasis dermatitis',
  'Prurigo of Pregnancy':            'Prurigo gestationis',
  'Mucous Membrane Pemphigoid':      'Mucous membrane pemphigoid',
  'Anagen Effluvium':                'Anagen effluvium',
  'Juvenile Plantar Dermatosis':     'Juvenile plantar dermatosis',
  'Pityriasis Lichenoides Chronica': 'Pityriasis lichenoides chronica',
  'Sebopsoriasis':                   'Seborrhoeic dermatitis',
  'Delusional Parasitosis':          'Delusional parasitosis',
  'Warfarin Skin Necrosis':          'Coumarin necrosis',
  'Contact Urticaria':               'Contact urticaria',
  'Aquagenic Urticaria':             'Aquagenic urticaria',
  'Lichen Aureus':                   'Lichen aureus',
  "Becker's Nevus":                  "Becker's nevus",
  'Naevus of Ota':                   'Nevus of Ota',
  'Leukonychia':                    'Leukonychia',
  'Subungual Hematoma':             'Subungual hematoma',
  'Nail Psoriasis':                 'Nail psoriasis',
  'Koilonychia':                    'Koilonychia',
  "Beau's Lines":                   "Beau's lines",
  'Yellow Nail Syndrome':           'Yellow nail syndrome',
  'Cherry Angioma':                 'Cherry hemangioma',
  'Spider Angioma':                 'Spider angioma',
  'Venous Lake':                    'Venous lake',
  'Port Wine Stain':                'Port-wine stain',
  'Infantile Hemangioma':           'Infantile hemangioma',
  'Pyogenic Granuloma':             'Pyogenic granuloma',
  'Telangiectasia':                 'Telangiectasia',
  'Furuncle':                       'Furuncle',
  'Carbuncle':                      'Carbuncle (medicine)',
  'Skin Abscess':                   'Abscess',
  'Staphylococcal Scalded Skin Syndrome': 'Staphylococcal scalded skin syndrome',
  'Tinea Barbae':                   'Tinea barbae',
  'Tinea Manuum':                   'Tinea manuum',
  'Flat Warts':                     'Verruca plana',
  'Plantar Warts':                  'Plantar wart',
  'Genital Warts':                  'Genital wart',
  'Perianal Streptococcal Dermatitis': 'Perianal dermatitis',
  'Hand Eczema':                    'Hand eczema',
  'Asteatotic Eczema':              'Eczema craquelé',
  'Intertrigo':                     'Intertrigo',
  'Diaper Dermatitis':              'Diaper rash',
  'Eyelid Dermatitis':              'Contact dermatitis',
  'Irritant Contact Dermatitis':    'Irritant contact dermatitis',
  'Allergic Contact Dermatitis':    'Allergic contact dermatitis',
  'Chronic Spontaneous Urticaria':  'Chronic urticaria',
  'Cholinergic Urticaria':          'Cholinergic urticaria',
  'Cold Urticaria':                 'Cold urticaria',
  'Angioedema':                     'Angioedema',
  'Dermatographism':                'Dermatographic urticaria',
  'Drug Exanthem':                  'Drug eruption',
  'Drug-induced Photosensitivity':  'Photosensitivity reaction',
  'Serum Sickness-like Reaction':   'Serum sickness',
  'Sunburn':                        'Sunburn',
  'Phytophotodermatitis':           'Phytophotodermatitis',
  'Actinic Purpura':                'Actinic purpura',
  'Polymorphous Light Eruption':    'Polymorphous light eruption',
  'Solar Elastosis':                'Solar elastosis',
  'Favre-Racouchot Syndrome':       'Favre–Racouchot syndrome',
  'Actinic Cheilitis':              'Actinic cheilitis',
  'Pemphigus Foliaceus':            'Pemphigus foliaceus',
  'Polymorphic Eruption of Pregnancy': 'Polymorphic eruption of pregnancy',
  'Pemphigoid Gestationis':         'Pemphigoid gestationis',
  'Intrahepatic Cholestasis of Pregnancy': 'Intrahepatic cholestasis of pregnancy',
  'Diabetic Dermopathy':            'Diabetic dermopathy',
  'Pretibial Myxedema':             'Pretibial myxedema',
  'Striae Distensae':               'Stretch marks',
  'Erythema Toxicum Neonatorum':    'Erythema toxicum neonatorum',
  'Mongolian Spot':                 'Mongolian spot',
  'Infantile Seborrheic Dermatitis':'Cradle cap',
  'Salmon Patch':                   'Nevus simplex',
  'Neonatal Acne':                  'Neonatal acne',
  'Erythema Ab Igne':               'Erythema ab igne',
  'Xanthelasma Palpebrarum':        'Xanthelasma',
  'Digital Mucous Cyst':            'Digital myxoid cyst',
  'Pilar Cyst':                     'Pilar cyst',
  'Sebaceous Adenoma':              'Sebaceous adenoma',
  'Oral Lichen Planus':             'Oral lichen planus',
  'Geographic Tongue':              'Geographic tongue',
  'Aphthous Stomatitis':            'Aphthous stomatitis',
  'Oral Leukoplakia':               'Leukoplakia',
  'Dermatitis Artefacta':           'Dermatitis artefacta',
  'Aquagenic Pruritus':             'Aquagenic pruritus',
  'Excoriation Disorder':           'Excoriation disorder',
  'Corns and Calluses':             'Corn (medicine)',
  'Ingrown Toenail':                'Ingrown toenail',
  'Longitudinal Melanonychia':      'Melanonychia',
  'Onychogryposis':                 'Onychogryphosis',
  'Alopecia Totalis':               'Alopecia totalis',
  'Frontal Fibrosing Alopecia':     'Frontal fibrosing alopecia',
  'Lymphangioma Circumscriptum':    'Lymphangioma circumscriptum',
  'Acne Excoriée':                  'Acne excoriée',
  'Pityriasis Amiantacea':          'Pityriasis amiantacea',
  'Lichen Planus Pigmentosus':      'Lichen planus pigmentosus',
  'Hypertrophic Lichen Planus':     'Lichen planus',
  'Annular Lichen Planus':          'Lichen planus',
  'Black Hairy Tongue':             'Black hairy tongue',
  'Friction Blister':               'Blister',
  'Varicose Eczema':                'Stasis dermatitis',
  'Chronic Venous Insufficiency':   'Chronic venous insufficiency',
  "Raynaud's Phenomenon":           'Raynaud syndrome',
  'Linear IgA Bullous Dermatosis':  'Linear IgA bullous dermatosis',
  'Prurigo of Pregnancy':           'Prurigo gestationis',
  'Systemic Sclerosis Skin':        'Systemic scleroderma',
  'Mucous Membrane Pemphigoid':     'Mucous membrane pemphigoid',
  'Papular Urticaria':              'Papular urticaria',
  'Anagen Effluvium':               'Anagen effluvium',
  'Juvenile Plantar Dermatosis':    'Juvenile plantar dermatosis',
  'Pityriasis Lichenoides Chronica':'Pityriasis lichenoides chronica',
  'Sebopsoriasis':                  'Seborrhoeic dermatitis',
  'Delusional Parasitosis':         'Delusional parasitosis',
  'Warfarin Skin Necrosis':         'Coumarin necrosis',
  'Contact Urticaria':              'Contact urticaria',
  'Aquagenic Urticaria':            'Aquagenic urticaria',
  'Pressure Urticaria':             'Pressure urticaria',
  'Solar Urticaria':                'Solar urticaria',
  'Acrodermatitis of Hallopeau':    'Acrodermatitis continua of Hallopeau',
  'Lichen Aureus':                  'Lichen aureus',
  "Becker's Nevus":                 "Becker's nevus",
  'Naevus of Ota':                  'Nevus of Ota',
  'Dysplastic Nevus':               'Dysplastic nevus',
  'Blue Nevus':                     'Blue nevus',
  'Spitz Nevus':                    'Spitz nevus',
  'Congenital Melanocytic Nevus':   'Congenital melanocytic nevus',
  'Junctional Nevus':               'Melanocytic nevus',
  'Drug-induced Hair Loss':         'Hair loss',
  'Milium':                         'Milium (dermatology)',
  'Post-Acne Scarring':             'Acne',
  'Hypertrophic Scar':              'Hypertrophic scar',
  'Impetigo Contagiosa':            'Impetigo',
  'Pityriasis Versicolor':          'Tinea versicolor',
  'Psoriasis Vulgaris':             'Psoriasis',
  'Herpes Simplex Virus Infection': 'Herpes simplex',
  'Sebaceous Hyperplasia':          'Sebaceous hyperplasia',
  'Neonatal Acne':                  'Neonatal acne',
  'Keratosis Pilaris':              'Keratosis pilaris',
  'Acanthosis Nigricans':           'Acanthosis nigricans',
  'Seborrheic Keratosis':           'Seborrheic keratosis',
  'Milia':                          'Milium (dermatology)',
  'Granuloma Annulare':             'Granuloma annulare',
  'Erythema Nodosum':               'Erythema nodosum',
  'Nummular Dermatitis':            'Nummular eczema',
  'Ichthyosis Vulgaris':            'Ichthyosis vulgaris',
};

// ---------------------------------------------------------------------------
// Download image bytes into a Buffer (bypasses Cloudinary↔Wikimedia rate-limiting)
// ---------------------------------------------------------------------------
function downloadBuffer(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Too many redirects'));
    const client = url.startsWith('https://') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Dermalyze-Bot/1.0 (medical education; contact: admin@dermalyze.com)',
        'Accept': 'image/*,*/*',
      },
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        return downloadBuffer(res.headers.location, redirectCount + 1).then(resolve).catch(reject);
      }
      if (res.statusCode === 429) {
        res.resume();
        const retryAfter = (parseInt(res.headers['retry-after'] || '60', 10) + 5) * 1000;
        process.stdout.write(`  ⏳ download 429 — waiting ${Math.ceil(retryAfter/1000)}s... `);
        return setTimeout(() => downloadBuffer(url, redirectCount).then(resolve).catch(reject), retryAfter);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const MAX_BYTES = 8 * 1024 * 1024;
      const chunks = [];
      let totalBytes = 0;
      res.on('data', c => {
        totalBytes += c.length;
        if (totalBytes > MAX_BYTES) {
          res.destroy();
          return reject(new Error(`Image too large (>${Math.round(MAX_BYTES/1024/1024)}MB)`));
        }
        chunks.push(c);
      });
      res.on('end',  () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ---------------------------------------------------------------------------
// Upload a Buffer to Cloudinary via upload_stream
// ---------------------------------------------------------------------------
function uploadBuffer(buf, slug) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'dermalyze/diseases',
        public_id: slug,
        overwrite: true,
        transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto:good' }],
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buf);
  });
}

// ---------------------------------------------------------------------------
// Fetch JSON (handles HTTPS + redirects)
// ---------------------------------------------------------------------------
function fetchJson(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Too many redirects'));
    const client = url.startsWith('https://') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Dermalyze-Bot/1.0',
        'Accept': 'application/json',
      },
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        return fetchJson(res.headers.location, redirectCount + 1).then(resolve).catch(reject);
      }
      if (res.statusCode === 429) {
        res.resume();
        const retryAfter = (parseInt(res.headers['retry-after'] || '60', 10) + 5) * 1000;
        process.stdout.write(`  ⏳ API 429 — waiting ${Math.ceil(retryAfter/1000)}s... `);
        return setTimeout(() => fetchJson(url, redirectCount).then(resolve).catch(reject), retryAfter);
      }
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch { resolve(null); }
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ---------------------------------------------------------------------------
// Try Wikipedia REST Summary API — returns thumbnail.source for any article
// that has a lead image (no Wikidata pageimage property required)
// ---------------------------------------------------------------------------
async function tryWikipediaSummary(articleTitle) {
  const encoded = encodeURIComponent(articleTitle.replace(/ /g, '_'));
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
  const data = await fetchJson(url);
  if (!data || data.type === 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found') return null;
  // Use thumbnail.source as-is — DO NOT modify the px size; Wikimedia only
  // generates thumbnails at specific pre-rendered sizes (HTTP 400 otherwise)
  return data.thumbnail?.source || null;
}

// ---------------------------------------------------------------------------
// Try Wikipedia prop=images — fetches all images used in the article and
// returns a Wikimedia Commons direct URL for the first usable one.
// This works even when no 'page image' is set on the article.
// ---------------------------------------------------------------------------
async function tryWikiImages(articleTitle) {
  const encoded = encodeURIComponent(articleTitle);
  const url =
    `https://en.wikipedia.org/w/api.php?action=query` +
    `&titles=${encoded}` +
    `&prop=images` +
    `&format=json` +
    `&imlimit=10` +
    `&redirects=1`;
  const data = await fetchJson(url);
  if (!data?.query?.pages) return null;
  const page = Object.values(data.query.pages)[0];
  if (!page || page.missing !== undefined || !page.images) return null;
  // Filter to photo-like images (JPG/PNG), skip flags, icons, logos, SVG
  const candidates = page.images
    .filter(img => {
      const t = img.title.toLowerCase();
      return (t.endsWith('.jpg') || t.endsWith('.jpeg') || t.endsWith('.png'))
        && !t.includes('flag') && !t.includes('icon') && !t.includes('logo')
        && !t.includes('map') && !t.includes('symbol') && !t.includes('sign')
        && !t.includes('edit') && !t.includes('question');
    })
    .slice(0, 5);

  if (candidates.length === 0) return null;

  // Encode each title individually, join with literal | (not %7C)
  const titlesList = candidates.map(i => encodeURIComponent(i.title)).join('|');
  const infoUrl =
    `https://en.wikipedia.org/w/api.php?action=query` +
    `&titles=${titlesList}` +
    `&prop=imageinfo` +
    `&iiprop=url|mime|size` +
    `&iiurlwidth=600` +
    `&format=json`;
  const infoData = await fetchJson(infoUrl);
  if (!infoData?.query?.pages) return null;
  const imgPages = Object.values(infoData.query.pages);
  for (const p of imgPages) {
    const info = p.imageinfo?.[0];
    if (!info) continue;
    if (info.mime === 'image/svg+xml') continue;
    // Only use thumburl — never fall back to full URL which can be >8MB
    if (info.thumburl) return info.thumburl;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Try Wikipedia MediaWiki pageimages API (fallback)
// ---------------------------------------------------------------------------
async function tryWikipedia(articleTitle) {
  const encoded = encodeURIComponent(articleTitle);
  // Use literal | (pipe) in piprop — %7C is not reliably decoded by MediaWiki
  const url =
    `https://en.wikipedia.org/w/api.php?action=query` +
    `&titles=${encoded}` +
    `&prop=pageimages` +
    `&format=json` +
    `&piprop=original|thumbnail` +
    `&pithumbsize=800` +
    `&redirects=1`;
  const data = await fetchJson(url);
  if (!data?.query?.pages) return null;
  const page = Object.values(data.query.pages)[0];
  if (!page || page.missing !== undefined) return null;
  // Prefer thumbnail (bounded ≤800px, usually <2MB) over original (can be 10MB+)
  // Only return the thumbnail (bounded size) — never original which can be >8MB
  return page.thumbnail?.source || null;
}

// ---------------------------------------------------------------------------
// Fallback: search Wikimedia Commons for the disease
// ---------------------------------------------------------------------------
async function tryCommons(searchTerm, qualifier = ' skin') {
  const encoded = encodeURIComponent(searchTerm + qualifier);
  const url =
    `https://commons.wikimedia.org/w/api.php?action=query` +
    `&generator=search` +
    `&gsrnamespace=6` +
    `&gsrsearch=${encoded}` +
    `&gsrlimit=8` +
    `&prop=imageinfo` +
    `&iiprop=url|mime|size` +
    `&iiurlwidth=600` +
    `&format=json`;
  const data = await fetchJson(url);
  if (!data?.query?.pages) return null;
  const pages = Object.values(data.query.pages);
  // Return the 600px thumbnail URL — never the full-res URL (can be >50MB)
  for (const p of pages) {
    const info = p.imageinfo?.[0];
    if (!info) continue;
    if (info.mime === 'image/svg+xml') continue;
    // thumburl is set when iiurlwidth is specified
    if (info.thumburl) return info.thumburl;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Get the best available image URL for a disease
// ---------------------------------------------------------------------------
async function getImageUrl(diseaseName) {
  const articleTitle = WIKI_OVERRIDES[diseaseName] || diseaseName;

  // 1. Try Wikipedia REST Summary (lead image — works for most articles)
  let url = await tryWikipediaSummary(articleTitle).catch(() => null);
  if (url) return url;

  // 2. Try Wikipedia MediaWiki pageimages API
  url = await tryWikipedia(articleTitle).catch(() => null);
  if (url) return url;

  // 3. Try Wikipedia prop=images (any image used in article body)
  url = await tryWikiImages(articleTitle).catch(() => null);
  if (url) return url;

  // 4. Try Commons search with article title + 'skin'
  url = await tryCommons(articleTitle, ' skin').catch(() => null);
  if (url) return url;

  // 5. Try Commons with article title, no qualifier (broader)
  url = await tryCommons(articleTitle, '').catch(() => null);
  if (url) return url;

  // 6. Try Commons with original disease name (if override was used)
  if (articleTitle !== diseaseName) {
    url = await tryCommons(diseaseName, ' skin').catch(() => null);
    if (url) return url;
    url = await tryCommons(diseaseName, '').catch(() => null);
    if (url) return url;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ DB connected\n');

    const [rows] = await sequelize.query(
      `SELECT id, name FROM Diseases WHERE imageUrl IS NULL ORDER BY id`
    );
    console.log(`📋 ${rows.length} diseases still need images\n`);

    let uploaded = 0, skipped = 0, failed = 0;

    for (const { id, name } of rows) {
      process.stdout.write(`[${String(id).padStart(3)}] ${name.padEnd(52)} `);

      // Step 1: find image source URL
      let sourceUrl = null;
      try {
        sourceUrl = await getImageUrl(name);
      } catch (e) { /* silent */ }

      if (!sourceUrl) {
        console.log('⚠️  no image found');
        skipped++;
        // Small pause to respect API rate limits
        await new Promise(r => setTimeout(r, 300));
        continue;
      }

      // Step 2: download bytes locally (avoids Wikimedia→Cloudinary 429)
      let buf = null;
      try {
        buf = await downloadBuffer(sourceUrl);
      } catch (e) {
        console.log(`❌ download failed: ${e.message}`);
        failed++;
        await new Promise(r => setTimeout(r, 500));
        continue;
      }

      // Step 3: upload buffer to Cloudinary
      const slug = `disease_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
      try {
        const result = await uploadBuffer(buf, slug);
        await sequelize.query(
          `UPDATE Diseases SET imageUrl = :url WHERE id = :id`,
          { replacements: { url: result.secure_url, id } }
        );
        console.log(`✅ ${result.secure_url.slice(0, 60)}...`);
        uploaded++;
      } catch (e) {
        console.log(`❌ Cloudinary upload failed: ${e.message}`);
        failed++;
      }

      // Throttle: 3s between diseases to stay within Wikimedia rate limits
      await new Promise(r => setTimeout(r, 3000));
    }

    console.log('\n==============================');
    console.log(`✅ Uploaded : ${uploaded}`);
    console.log(`⚠️  Skipped  : ${skipped}  (no image found)`);
    console.log(`❌ Failed   : ${failed}`);
    console.log('==============================');
    process.exit(0);

  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  }
})();

require('dotenv').config();
const { sequelize } = require('./config/db');
const { QueryTypes } = require('sequelize');
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    await sequelize.authenticate();
    const diseases = await sequelize.query(`SELECT name, category, scientificName FROM Diseases ORDER BY name ASC`, { type: QueryTypes.SELECT });
    
    let md = `# قائمة الأمراض الجلدية المدعومة (${diseases.length} مرض)\n\n`;
    md += `هذه القائمة تم تجميعها بناءً على المراجع الطبية ومجموعات البيانات العالمية.\n\n`;
    
    diseases.forEach(d => {
      md += `- **${d.name}**`;
      if (d.scientificName && d.scientificName !== d.name) {
          md += ` *(Scientific: ${d.scientificName})*`;
      }
      if (d.category) {
          md += ` - [Category: ${d.category}]`;
      }
      md += `\n`;
    });

    const outPath = '/Users/assemahmed/.gemini/antigravity-ide/brain/5c81c44e-3dce-4d7c-8b0d-ae9eab709a71/artifacts/supported_diseases_list.md';
    fs.writeFileSync(outPath, md);
    console.log("Exported successfully to " + outPath);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();

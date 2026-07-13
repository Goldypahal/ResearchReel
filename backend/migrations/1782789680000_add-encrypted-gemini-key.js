exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE reel_automation_settings 
    ADD COLUMN IF NOT EXISTS encrypted_gemini_api_key TEXT;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE reel_automation_settings 
    DROP COLUMN IF EXISTS encrypted_gemini_api_key;
  `);
};

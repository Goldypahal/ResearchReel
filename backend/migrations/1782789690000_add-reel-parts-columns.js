exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE reel_drafts 
    ADD COLUMN IF NOT EXISTS part_number INT,
    ADD COLUMN IF NOT EXISTS total_parts INT;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE reel_drafts 
    DROP COLUMN IF EXISTS part_number,
    DROP COLUMN IF EXISTS total_parts;
  `);
};

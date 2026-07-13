/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('media_assets', {
    id: {
      type: 'uuid',
      default: pgm.func('uuid_generate_v4()'),
      primaryKey: true,
    },
    owner_id: {
      type: 'uuid',
      references: '"users"',
      onDelete: 'CASCADE',
    },
    workspace_id: {
      type: 'uuid',
    },
    file_name: { type: 'varchar(255)', notNull: true },
    file_size_bytes: { type: 'bigint', notNull: true },
    mime_type: { type: 'varchar(100)', notNull: true },
    s3_bucket: { type: 'varchar(100)', notNull: true },
    s3_key: { type: 'text', notNull: true },
    public_url: { type: 'text', notNull: true },
    metadata: { type: 'jsonb', default: '{}' },
    tags: { type: 'text[]', default: '{}' },
    is_favorite: { type: 'boolean', default: false },
    is_deleted: { type: 'boolean', default: false },
    deleted_at: { type: 'timestamp with time zone' },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Indexes
  pgm.createIndex('media_assets', 'owner_id');
  pgm.createIndex('media_assets', 'workspace_id');
};

exports.down = pgm => {
  pgm.dropTable('media_assets');
};

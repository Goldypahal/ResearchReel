const db = require('../config/db');
const argon2 = require('argon2');

async function seed() {
  console.log('Starting ResearchReel database seeding...');
  
  try {
    // Generate password hash
    const passHash = await argon2.hash('Science123!');

    // 1. Insert seed users if they don't exist
    const usersToInsert = [
      {
        email: 'albert@princeton.edu',
        username: 'the_einstein',
        full_name: 'Albert Einstein',
        bio: 'Theoretical physicist. Working on unified field theories and quantum descriptions.',
        verification_status: 'scholar',
        role: 'professor',
        interests: ['Physics', 'Relativity', 'Cosmology']
      },
      {
        email: 'marie@sorbonne.edu',
        username: 'm_curie',
        full_name: 'Marie Curie',
        bio: 'Pioneer in radioactivity. Two-time Nobel laureate.',
        verification_status: 'scholar',
        role: 'professor',
        interests: ['Chemistry', 'Radioactivity', 'Science']
      },
      {
        email: 'tesla@wardenclyffe.org',
        username: 'tesla',
        full_name: 'Nikola Tesla',
        bio: 'Electrical wizard. Proponent of alternating current and wireless energy.',
        verification_status: 'scholar',
        role: 'scholar',
        interests: ['Physics', 'Electromagnetism', 'Coils']
      },
      {
        email: 'turing@cambridge.edu',
        username: 'a_turing',
        full_name: 'Alan Turing',
        bio: 'Mathematician, logician, cryptanalyst, and computer scientist.',
        verification_status: 'scholar',
        role: 'scholar',
        interests: ['Computation', 'Philosophy', 'AI']
      },
      {
        email: 'newton@mit.edu',
        username: 'julianewton',
        full_name: 'Dr. Julia Newton',
        bio: 'Cognitive systems researcher focusing on neuro-symbolic reasoning.',
        verification_status: 'scholar',
        role: 'scholar',
        interests: ['ArtificialIntelligence', 'NeuroSymbolic', 'MachineLearning']
      },
      {
        email: 'alex@stanford.edu',
        username: 'athompson_cs',
        full_name: 'Alex Thompson',
        bio: 'PhD candidate researching meta-surfaces and nanoscale optics.',
        verification_status: 'student',
        role: 'student',
        interests: ['Physics', 'Metasurfaces', 'Optics']
      }
    ];

    const userIds = {};

    for (const u of usersToInsert) {
      // Check if user exists
      const checkUser = await db.query('SELECT id FROM users WHERE username = $1', [u.username]);
      if (checkUser.rows.length === 0) {
        const inserted = await db.query(
          `INSERT INTO users (email, username, password_hash, full_name, bio, verification_status, role, research_interests) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [u.email, u.username, passHash, u.full_name, u.bio, u.verification_status, u.role, u.interests]
        );
        userIds[u.username] = inserted.rows[0].id;
        console.log(`Seeded user: ${u.username}`);
      } else {
        userIds[u.username] = checkUser.rows[0].id;
        console.log(`User already exists: ${u.username}`);
      }
    }

    // 2. Insert sample posts
    const postsToInsert = [
      {
        username: 'the_einstein',
        content_type: 'text',
        caption: 'Working on the Unified Field Theory. Sometimes the simplest answer is the most elegant.',
        tags: ['Physics', 'Relativity', 'Cosmology'],
        doi: '10.1103/PhysRev.47.777'
      },
      {
        username: 'm_curie',
        content_type: 'text',
        caption: 'Observed anomalous energy decays in isotope decay chains under cryogenic conditions. The blue Cherenkov glow is breathtaking.',
        tags: ['Chemistry', 'Radioactivity', 'Science'],
        doi: '10.1038/nature12345'
      },
      {
        username: 'tesla',
        content_type: 'text',
        caption: 'Testing high frequency electrical discharge on custom coils. Capturing the magnetic field oscillations on camera.',
        tags: ['Physics', 'Electromagnetism', 'Coils'],
        doi: '10.1006/jcis.2001.7828'
      },
      {
        username: 'a_turing',
        content_type: 'text',
        caption: 'Can machines think? The imitation game suggests that intelligence is a matter of behavior, not substance.',
        tags: ['Computation', 'Philosophy', 'AI'],
        doi: '10.1093/mind/LIX.236.433'
      },
      {
        username: 'julianewton',
        content_type: 'text',
        caption: 'Excited to share our latest research on neural-symbolic integration for large scale reasoning. We\'ve bridged the gap between logical consistency and transformer performance.',
        tags: ['ArtificialIntelligence', 'NeuroSymbolic', 'MachineLearning'],
        doi: '10.1145/3318464.3389700'
      },
      {
        username: 'athompson_cs',
        content_type: 'text',
        caption: 'Quick question for the #Optics community: Has anyone encountered aberrant diffraction patterns when using 405nm laser pulses on custom silicon metasurfaces?',
        tags: ['Physics', 'Metasurfaces', 'Optics'],
        doi: null
      }
    ];

    for (const p of postsToInsert) {
      const authorId = userIds[p.username];
      if (!authorId) continue;

      // Check if post already exists
      const checkPost = await db.query(
        'SELECT id FROM posts WHERE author_id = $1 AND caption = $2',
        [authorId, p.caption]
      );

      if (checkPost.rows.length === 0) {
        await db.query(
          `INSERT INTO posts (author_id, content_type, caption, tags, doi) 
           VALUES ($1, $2, $3, $4, $5)`,
          [authorId, p.content_type, p.caption, p.tags, p.doi]
        );
        console.log(`Seeded post for ${p.username}`);
      }
    }

    // 3. Insert sample videos / reels
    const videosToInsert = [
      {
        username: 'julianewton',
        title: 'Neuro-Symbolic Integration',
        description: 'Explaining how we bridged transformer performance with logical consistency using symbolic neural-symbolic networks.',
        video_url: 'https://v.videomaker.app/v1.mp4',
        tags: ['ArtificialIntelligence', 'NeuroSymbolic', 'Reasoning'],
        duration: 45
      },
      {
        username: 'athompson_cs',
        title: 'Aberrant Diffraction Patterns',
        description: 'Visualizing 405nm laser pulse diffraction on silicon metasurfaces in our cleanroom setup 🔬.',
        video_url: 'https://v.videomaker.app/v2.mp4',
        tags: ['Physics', 'Metasurfaces', 'Optics'],
        duration: 50
      },
      {
        username: 'the_einstein',
        title: 'Gravitational Lensing Demonstration',
        description: 'Simple visual experiment showing how massive space-time curves bend light rays.',
        video_url: 'https://v.videomaker.app/v3.mp4',
        tags: ['Physics', 'Relativity', 'SpaceTime'],
        duration: 55
      }
    ];

    for (const v of videosToInsert) {
      const authorId = userIds[v.username];
      if (!authorId) continue;

      // Check if video already exists
      const checkVideo = await db.query(
        'SELECT id FROM videos WHERE author_id = $1 AND title = $2',
        [authorId, v.title]
      );

      if (checkVideo.rows.length === 0) {
        await db.query(
          `INSERT INTO videos (author_id, title, description, video_url, duration_seconds, tags) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [authorId, v.title, v.description, v.video_url, v.duration, v.tags]
        );
        console.log(`Seeded video: ${v.title}`);
      }
    }

    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    process.exit(0);
  }
}

seed();

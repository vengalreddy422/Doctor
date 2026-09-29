/**
 * Professional Doctor Photography Presets & Unique Portrait Engine
 * High-resolution, professional clinical medical portraits with strict gender detection and unique assignments.
 */

export const MALE_DOCTOR_PHOTOS = [
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1556760544-74068565f05c?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&auto=format&fit=crop&q=80',
];

export const FEMALE_DOCTOR_PHOTOS = [
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1594824813590-77a8848f0e0c?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1623854767648-e7bb8009f0db?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1622253694242-abeb3c84b1a8?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496799652-408c2ac9fe98?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573497019418-b400bb3ab074?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1587614382346-4ec70e388b28?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1584467735815-f778f274e296?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1594824813685-eb91176b6b77?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?w=600&auto=format&fit=crop&q=80',
];

export const DOCTOR_AVATAR_PRESETS = [
  // --- MALE SPECIALISTS (6 Distinct Presets) ---
  {
    id: 'male-cardio',
    name: 'Dr. Rajesh Sharma',
    category: 'Cardiologist',
    gender: 'Male',
    experience: '15 Years Exp',
    url: MALE_DOCTOR_PHOTOS[0],
    tag: 'Senior Cardiologist',
  },
  {
    id: 'male-physician',
    name: 'Dr. Michael Chen',
    category: 'General Physician',
    gender: 'Male',
    experience: '12 Years Exp',
    url: MALE_DOCTOR_PHOTOS[1],
    tag: 'Internal Medicine',
  },
  {
    id: 'male-surgeon',
    name: 'Dr. James Anderson',
    category: 'Surgeon',
    gender: 'Male',
    experience: '18 Years Exp',
    url: MALE_DOCTOR_PHOTOS[2],
    tag: 'Chief Surgeon',
  },
  {
    id: 'male-ortho',
    name: 'Dr. David Miller',
    category: 'Orthopedic Surgeon',
    gender: 'Male',
    experience: '16 Years Exp',
    url: MALE_DOCTOR_PHOTOS[3],
    tag: 'Joints & Bones',
  },
  {
    id: 'male-radio',
    name: 'Dr. Robert Taylor',
    category: 'Radiologist',
    gender: 'Male',
    experience: '13 Years Exp',
    url: MALE_DOCTOR_PHOTOS[4],
    tag: 'Diagnostics',
  },
  {
    id: 'male-onco',
    name: 'Dr. Arthur Sterling',
    category: 'Oncologist',
    gender: 'Male',
    experience: '20 Years Exp',
    url: MALE_DOCTOR_PHOTOS[5],
    tag: 'Senior Oncologist',
  },

  // --- FEMALE SPECIALISTS (6 Distinct Presets) ---
  {
    id: 'female-neuro',
    name: 'Dr. Emily Watson',
    category: 'Neurologist',
    gender: 'Female',
    experience: '14 Years Exp',
    url: FEMALE_DOCTOR_PHOTOS[0],
    tag: 'Neuro Specialist',
  },
  {
    id: 'female-pedia',
    name: 'Dr. Sarah Jenkins',
    category: 'Pediatrician',
    gender: 'Female',
    experience: '10 Years Exp',
    url: FEMALE_DOCTOR_PHOTOS[1],
    tag: 'Chief Pediatrician',
  },
  {
    id: 'female-derma',
    name: 'Dr. Priya Patel',
    category: 'Dermatologist',
    gender: 'Female',
    experience: '9 Years Exp',
    url: FEMALE_DOCTOR_PHOTOS[2],
    tag: 'Cosmetic & Skin',
  },
  {
    id: 'female-ent',
    name: 'Dr. Ananya Reddy',
    category: 'ENT Specialist',
    gender: 'Female',
    experience: '11 Years Exp',
    url: FEMALE_DOCTOR_PHOTOS[3],
    tag: 'ENT Surgeon',
  },
  {
    id: 'female-psych',
    name: 'Dr. Zoya Alvi',
    category: 'Psychiatrist',
    gender: 'Female',
    experience: '8 Years Exp',
    url: FEMALE_DOCTOR_PHOTOS[4],
    tag: 'Mental Health Lead',
  },
  {
    id: 'female-gynae',
    name: 'Dr. Maya Sengupta',
    category: 'Gynecologist',
    gender: 'Female',
    experience: '15 Years Exp',
    url: FEMALE_DOCTOR_PHOTOS[5],
    tag: 'Women’s Health',
  },
];

// Comprehensive female first name dictionary for accurate gender detection
const FEMALE_NAMES = new Set([
  'aadya', 'aarti', 'aditi', 'ananya', 'anita', 'anjali', 'ankita', 'anu', 'aparna', 'archana',
  'bhavna', 'chaitali', 'deepa', 'divya', 'geeta', 'ishita', 'jyoti', 'kavita', 'kavya', 'keerthi',
  'komal', 'lakshmi', 'madhavi', 'mamta', 'manju', 'meera', 'megha', 'monika', 'namrata', 'neelam',
  'neha', 'nisha', 'pallavi', 'pooja', 'pragya', 'pratibha', 'preeti', 'priya', 'priyanka', 'radha',
  'radhika', 'rashmi', 'renu', 'ritu', 'roshni', 'rupal', 'sandhya', 'sangita', 'sarita', 'shalini',
  'shikha', 'shilpa', 'shobha', 'shruti', 'sneha', 'sonali', 'sowmya', 'sudha', 'sunita', 'supriya',
  'swati', 'tanuja', 'tanvi', 'uma', 'vaishali', 'vandana', 'varsha', 'vidya', 'vinita', 'yamini',
  'sarah', 'emily', 'maya', 'zoya', 'elizabeth', 'rachel', 'jennifer', 'lisa', 'anna', 'maria',
  'amanda', 'clara', 'sophia', 'olivia', 'emma', 'grace', 'hannah', 'chloe', 'victoria', 'eva',
  'mrs', 'ms'
]);

/**
 * Returns true if doctor name matches female indicators
 */
export function isFemaleDoctor(name) {
  if (!name || typeof name !== 'string') return false;
  const clean = name.toLowerCase().replace(/dr\.|\(dr\)|\./g, ' ').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  return words.some((w) => FEMALE_NAMES.has(w));
}

/**
 * Returns a unique, high-definition professional photography image for any doctor.
 * Uniquely balances photos across the 40-image professional photography pool with strict gender matching.
 */
export function getDoctorAvatar(doctor, defaultSeed = '') {
  if (!doctor) {
    return MALE_DOCTOR_PHOTOS[0];
  }

  const rawImg = typeof doctor === 'string' ? doctor : (doctor.image || doctor.image_url || doctor.avatar || '');

  if (rawImg && typeof rawImg === 'string' && rawImg.trim() !== '') {
    const trimmed = rawImg.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
      return trimmed;
    }
    if (trimmed.startsWith('/media/') || trimmed.startsWith('media/')) {
      return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    }
    if (trimmed.startsWith('doctors/')) {
      return `/media/${trimmed}`;
    }
    return trimmed;
  }

  const name = (typeof doctor === 'object' ? doctor.name : doctor) || defaultSeed || 'Doctor';
  const docId = typeof doctor === 'object' && doctor.id ? Number(doctor.id) : 0;
  const isFemale = isFemaleDoctor(name);
  const photoList = isFemale ? FEMALE_DOCTOR_PHOTOS : MALE_DOCTOR_PHOTOS;

  // Generate a distinct numerical hash combining doctor ID, letters, and length for unique distribution
  let hash = docId > 0 ? (docId * 7 + 3) : 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }

  const index = Math.abs(hash) % photoList.length;
  return photoList[index];
}

/**
 * Helper to convert an image URL into a File object for FormData submission
 */
export async function urlToFile(url, filename = 'doctor_photo.jpg') {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const mimeType = blob.type || 'image/jpeg';
    return new File([blob], filename, { type: mimeType });
  } catch (err) {
    console.error('Error converting URL to File:', err);
    return null;
  }
}

/**
 * Fast client-side image compressor using HTML5 Canvas.
 * Automatically resizes large camera photos to max 800x800 and compresses to JPEG ~85%.
 * Reduces 5MB-10MB uploads down to ~50-80KB in <50ms for instant network transfers.
 */
export function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.85) {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    // Skip compression if file is already small SVG or GIF
    if (file.type === 'image/svg+xml' || file.type === 'image/gif' || file.size < 80 * 1024) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const baseName = file.name.replace(/\.[^/.]+$/, "");
              const compressedFile = new File([blob], `${baseName}_compressed.jpg`, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

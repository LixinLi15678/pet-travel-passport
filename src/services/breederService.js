import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, firebaseAvailable } from '../firebase/config';
import { DEFAULT_PET_ID } from './fileUploadService';

const COLLECTION_NAME = 'breeders';

const buildPetSnapshot = (pets = [], files = []) => {
  const fileMap = new Map();
  files.forEach((file) => {
    if (!file) return;
    const petId = file.petId || DEFAULT_PET_ID;
    if (!fileMap.has(petId)) {
      fileMap.set(petId, []);
    }
    fileMap.get(petId).push({
      fileId: file.id,
      name: file.name,
      uploadedAt: file.uploadedAt,
      type: file.type,
      size: file.size
    });
  });

  return pets.map((pet) => ({
    id: pet.id,
    name: pet.name || null,
    createdAt: pet.createdAt || null,
    files: fileMap.get(pet.id) || []
  }));
};

class BreederService {
  constructor() {
    this.enabled = firebaseAvailable;
  }

  async getBreeder(userId) {
    if (!userId || !this.enabled) {
      return { pets: [] };
    }

    try {
      const breederDoc = await getDoc(doc(db, COLLECTION_NAME, userId));
      if (!breederDoc.exists()) {
        return { pets: [] };
      }
      return breederDoc.data();
    } catch (error) {
      console.error('Failed to load breeder data:', error);
      return { pets: [] };
    }
  }

  async saveSnapshot(userId, pets = [], files = []) {
    if (!userId || !this.enabled) {
      return;
    }

    const payload = {
      userId,
      pets: buildPetSnapshot(pets, files),
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, COLLECTION_NAME, userId), payload, { merge: true });
    } catch (error) {
      console.error('Failed to save breeder data:', error);
    }
  }
}

const breederService = new BreederService();

export default breederService;

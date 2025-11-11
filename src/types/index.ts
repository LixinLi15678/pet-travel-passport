import { User } from 'firebase/auth';

// Pet Profile Types
export interface PetProfile {
  id: string;
  name?: string;
  createdAt: string;
  dimensions?: PetDimensions;
}

export interface PetDimensions {
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
  unit?: 'cm' | 'in';
  weightUnit?: 'kg' | 'lb';
}

// File Types
export interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  category: string;
  data: string; // base64 string
  uploadedAt: string;
  userId: string;
  petId: string;
  source?: 'firestore' | 'local';
  dataStoredLocally?: boolean;
}

export interface FileValidationOptions {
  maxSize?: number;
  allowedTypes?: string[];
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

// User Progress Types
export interface UserProgress {
  currentStep?: 'main' | 'measure' | 'vaccine';
  reviewReady?: boolean;
  lastFileIds?: string[];
  lastFileCount?: number;
  pets?: PetProfile[];
  activePetId?: string | null;
}

// Breeder Types
export interface BreederData {
  pets?: PetProfile[];
  files?: FileInfo[];
  updatedAt?: string;
}

// Component Props Types
export interface AuthProps {
  onAuthSuccess: (user: User) => void;
}

export interface MainPageProps {
  user: User;
  onLogout: () => void;
  showLoginTip: boolean;
  onDismissLoginTip: (dontShowAgain: boolean) => void;
  onBeginSetup: () => void;
  petProfiles: PetProfile[];
  activePetId: string | null;
  onPetChange: (petId: string) => void;
  onAddPet: () => Promise<string | null>;
  onDeletePet: (petId: string) => Promise<void>;
  allFiles: FileInfo[];
}

export interface MeasureProps {
  user: User;
  onNext: () => void;
  onBack: () => void;
  onLogout: () => void;
  petProfiles: PetProfile[];
  activePetId: string | null;
  onPetChange: (petId: string) => void;
  onAddPet: () => Promise<string | null>;
  onDeletePet: (petId: string) => Promise<void>;
  allFiles: FileInfo[];
  onDimensionsUpdate: (petId: string, dimensions: PetDimensions) => void;
}

export interface VaccineProps {
  user: User;
  onNext: (data: { vaccineFiles: FileInfo[] }) => Promise<void>;
  onBack: () => void;
  onLogout: () => void;
  initialFiles: FileInfo[];
  onFilesChange: (petId: string, files: FileInfo[]) => void;
  petProfiles: PetProfile[];
  activePetId: string | null;
  onPetChange: (petId: string) => void;
  onAddPet: () => Promise<string | null>;
  onDeletePet: (petId: string) => Promise<void>;
  allFiles: FileInfo[];
}

export interface PetsModalProps {
  petProfiles: PetProfile[];
  activePetId: string | null;
  onPetChange: (petId: string) => void;
  onAddPet: () => Promise<string | null>;
  onDeletePet: (petId: string) => Promise<void>;
  allFiles: FileInfo[];
}

// Service Types
export type ProgressCallback = (progress: number) => void;
export type FileProgressCallback = (index: number, progress: number) => void;

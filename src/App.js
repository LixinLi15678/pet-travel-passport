import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase/config';
import Auth from './components/Auth';
import MainPage from './components/MainPage';
import Measure from './components/Measure';
import Vaccine from './components/Vaccine';
import userProgressService from './services/userProgressService';
import fileUploadService, { DEFAULT_PET_ID } from './services/fileUploadService';
import breederService from './services/breederService';
import './App.css';

/**
 * Main App Component - Pet Travel Passport Management System
 * Features:
 * 1. User Authentication (Email/Password)
 * 2. Data Management (CRUD operations)
 * 3. File Upload with base64 storage
 */
const isLegacyPetId = (petId) => !petId || petId === DEFAULT_PET_ID;

const buildPetProfiles = (progressPets = [], files = [], breederPets = []) => {
  const petMap = new Map();

  const upsertPet = (pet) => {
    if (!pet?.id || isLegacyPetId(pet.id)) return;
    const existing = petMap.get(pet.id) || {};
    petMap.set(pet.id, {
      ...existing,
      ...pet
    });
  };

  progressPets.forEach(upsertPet);
  breederPets.forEach(upsertPet);

  files.forEach((file) => {
    const petId = file?.petId;
    if (!petId || isLegacyPetId(petId) || petMap.has(petId)) {
      return;
    }
    petMap.set(petId, {
      id: petId,
      createdAt: file?.uploadedAt || new Date().toISOString()
    });
  });

  return Array.from(petMap.values());
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLoginTip, setShowLoginTip] = useState(false);
  const [currentPage, setCurrentPage] = useState('main'); // 'main', 'measure', or 'vaccine'
  const [initialVaccineFiles, setInitialVaccineFiles] = useState([]);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [petProfiles, setPetProfiles] = useState([]);
  const [activePetId, setActivePetId] = useState(null);
  const [allFiles, setAllFiles] = useState([]);

  const persistBreederSnapshot = useCallback((pets, files) => {
    if (!user) return;
    breederService.saveSnapshot(user.uid, pets, files).catch((error) => {
      console.error('Failed to persist breeder snapshot:', error);
    });
  }, [user]);

  useEffect(() => {
    // Listen to authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        console.log('User logged in:', currentUser.uid);
        // Check if user wants to see login tip
        const dontShowAgain = localStorage.getItem('dontShowLoginTip');
        if (!dontShowAgain) {
          setShowLoginTip(true);
        }
      } else {
        console.log('User logged out');
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setCurrentPage('main');
      setInitialVaccineFiles([]);
      setPetProfiles([]);
      setAllFiles([]);
      setActivePetId(null);
      setProgressLoaded(true);
      return;
    }

    let isCancelled = false;
    setProgressLoaded(false);

    const loadUserState = async () => {
      try {
        const [progress, files, breeder] = await Promise.all([
          userProgressService.getProgress(user.uid),
          fileUploadService.loadFiles(user.uid),
          breederService.getBreeder(user.uid)
        ]);

        if (isCancelled) return;

        if (progress?.currentStep) {
          setCurrentPage(progress.currentStep);
        }
        const normalizedPets = buildPetProfiles(progress?.pets, files, breeder?.pets);
        const desiredPetId = (() => {
          if (progress?.activePetId && normalizedPets.some(pet => pet.id === progress.activePetId)) {
            return progress.activePetId;
          }
          return normalizedPets[0]?.id || null;
        })();

        setPetProfiles(normalizedPets);
        setActivePetId(desiredPetId);
        setAllFiles(files);
        setInitialVaccineFiles(
          desiredPetId
            ? files.filter((file) => file.petId === desiredPetId)
            : []
        );

        userProgressService.saveProgress(user.uid, {
          currentStep: progress?.currentStep || 'main',
          pets: normalizedPets,
          activePetId: desiredPetId
        }).catch((error) => {
          console.error('Failed to sync progress during load:', error);
        });

        persistBreederSnapshot(normalizedPets, files);
      } catch (error) {
        console.error('Failed to load user progress/files:', error);
      } finally {
        if (!isCancelled) {
          setProgressLoaded(true);
        }
      }
    };

    loadUserState();

    return () => {
      isCancelled = true;
    };
  }, [user, persistBreederSnapshot]);

  const handleAuthSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    // Check if user wants to see login tip
    const dontShowAgain = localStorage.getItem('dontShowLoginTip');
    if (!dontShowAgain) {
      setShowLoginTip(true);
    }
  };

  const handleDismissLoginTip = (dontShowAgain) => {
    setShowLoginTip(false);
    if (dontShowAgain) {
      localStorage.setItem('dontShowLoginTip', 'true');
    }
  };

  const handleBeginSetup = () => {
    if (petProfiles.length === 0) {
      alert('Please add a pet profile before continuing.');
      return;
    }
    setCurrentPage('measure');
    if (user) {
      userProgressService.saveProgress(user.uid, { currentStep: 'measure' }).catch((error) => {
        console.error('Failed to save progress:', error);
      });
    }
  };

  const handleMeasureNext = () => {
    setCurrentPage('vaccine');
    if (user) {
      userProgressService.saveProgress(user.uid, { currentStep: 'vaccine' }).catch((error) => {
        console.error('Failed to save progress:', error);
      });
    }
  };

const handleMeasureBack = () => {
  setCurrentPage('main');
  if (user) {
    userProgressService.saveProgress(user.uid, { currentStep: 'main' }).catch((error) => {
      console.error('Failed to save progress:', error);
    });
  }
};

const handleVaccineBack = () => {
  setCurrentPage('measure');
  if (user) {
    userProgressService.saveProgress(user.uid, { currentStep: 'measure' }).catch((error) => {
      console.error('Failed to save progress:', error);
    });
  }
};

  const handleVaccineNext = async (data) => {
    if (!user) return;

    const files = data?.vaccineFiles || [];
    const fileIds = files.map((file) => file.id);

    try {
      await userProgressService.saveProgress(user.uid, {
        currentStep: 'vaccine',
        reviewReady: true,
        lastFileIds: fileIds,
        lastFileCount: files.length,
        pets: petProfiles,
        activePetId
      });
      alert('Vaccine upload saved! Review screen coming soon.');
    } catch (error) {
      console.error('Vaccine confirmation error:', error);
      alert('Failed to save documents. Please try again.');
    }
  };

  const handleVaccineFilesChange = useCallback((petId, files) => {
    const fallbackPetId = petId || activePetId || petProfiles[0]?.id || null;
    if (!fallbackPetId) {
      alert('Please add a pet profile before uploading documents.');
      return;
    }
    const normalizedPetId = fallbackPetId;
    const filesWithPet = files.map((file) => ({
      ...file,
      petId: file.petId || normalizedPetId
    }));
    const dedupedFiles = [];
    const seenIds = new Set();
    filesWithPet.forEach((file) => {
      const key = file.id || `${file.name}_${file.uploadedAt}`;
      if (seenIds.has(key)) {
        return;
      }
      seenIds.add(key);
      dedupedFiles.push(file);
    });

    const nextAllFiles = (() => {
      const others = allFiles.filter((file) => file.petId !== normalizedPetId);
      return [...others, ...dedupedFiles];
    })();
    setAllFiles(nextAllFiles);

    if (normalizedPetId === activePetId) {
      setInitialVaccineFiles(dedupedFiles);
    }

    let updatedPets = petProfiles;
    if (!petProfiles.some((pet) => pet.id === normalizedPetId)) {
      const newPet = {
        id: normalizedPetId,
        createdAt: dedupedFiles[0]?.uploadedAt || new Date().toISOString()
      };
      updatedPets = [...petProfiles, newPet];
      setPetProfiles(updatedPets);
    }

    const petsForSave = updatedPets;

    if (user) {
      userProgressService.saveProgress(user.uid, {
        currentStep: currentPage,
        lastFileIds: dedupedFiles.map((file) => file.id),
        lastFileCount: dedupedFiles.length,
        pets: petsForSave,
        activePetId: normalizedPetId
      }).catch((error) => {
        console.error('Failed to cache user progress:', error);
      });
    }

    persistBreederSnapshot(petsForSave, nextAllFiles);
  }, [user, currentPage, activePetId, petProfiles, allFiles, persistBreederSnapshot]);

  const handleDimensionsUpdate = useCallback((petId, newDimensions) => {
    if (!petId || isLegacyPetId(petId)) {
      return;
    }

    setPetProfiles((prevPets) => {
      let found = false;
      const updated = prevPets.map((pet) => {
        if (pet.id === petId) {
          found = true;
          return {
            ...pet,
            dimensions: newDimensions
          };
        }
        return pet;
      });

      if (!found) {
        return [
          ...updated,
          {
            id: petId,
            createdAt: new Date().toISOString(),
            dimensions: newDimensions
          }
        ];
      }

      return updated;
    });
  }, []);

  const handleDeletePet = useCallback(async (petId) => {
    if (!petId || isLegacyPetId(petId)) {
      console.warn('Ignoring delete request for invalid pet id:', petId);
      return;
    }
    const targetPetId = petId;
    const filesForPet = allFiles.filter((file) => file.petId === targetPetId);

    if (user && filesForPet.length > 0) {
      try {
        await fileUploadService.deleteFiles(filesForPet, user.uid);
      } catch (error) {
        console.error('Failed to delete pet files from storage:', error);
      }
    }

    const remainingFiles = allFiles.filter((file) => file.petId !== targetPetId);
    setAllFiles(remainingFiles);

    let remainingPets = petProfiles.filter((pet) => pet.id !== targetPetId);
    setPetProfiles(remainingPets);

    const nextActive = targetPetId === activePetId
      ? (remainingPets[0]?.id || null)
      : (activePetId || remainingPets[0]?.id || null);
    setActivePetId(nextActive);

    const nextFiles = nextActive
      ? remainingFiles.filter((file) => file.petId === nextActive)
      : [];
    setInitialVaccineFiles(nextFiles);

    if (user) {
      userProgressService.saveProgress(user.uid, {
        pets: remainingPets,
        activePetId: nextActive,
        currentStep: currentPage,
        lastFileIds: nextFiles.map((file) => file.id),
        lastFileCount: nextFiles.length
      }).catch((error) => {
        console.error('Failed to save progress after deleting pet:', error);
      });
    }

    persistBreederSnapshot(remainingPets, remainingFiles);
  }, [activePetId, allFiles, currentPage, petProfiles, user, persistBreederSnapshot]);

  const handlePetChange = useCallback((petId) => {
    const targetPetId = petId || activePetId || petProfiles[0]?.id || null;
    if (!targetPetId) {
      setActivePetId(null);
      setInitialVaccineFiles([]);
      if (user) {
        userProgressService.saveProgress(user.uid, {
          activePetId: null,
          pets: petProfiles,
          currentStep: currentPage
        }).catch((error) => {
          console.error('Failed to save active pet:', error);
        });
      }
      return;
    }
    setActivePetId(targetPetId);
    setInitialVaccineFiles(
      allFiles.filter((file) => file.petId === targetPetId)
    );

    if (user) {
      userProgressService.saveProgress(user.uid, {
        activePetId: targetPetId,
        pets: petProfiles,
        currentStep: currentPage
      }).catch((error) => {
        console.error('Failed to save active pet:', error);
      });
    }
  }, [activePetId, allFiles, currentPage, petProfiles, user]);

  const handleAddPet = useCallback(async () => {
    if (typeof window === 'undefined') {
      return null;
    }
    const nameInput = window.prompt('Give your pet a name:');
    if (nameInput === null) {
      return null;
    }
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      window.alert('Pet name is required.');
      return null;
    }

    const newPetId = `pet_${Date.now()}`;
    const newPet = {
      id: newPetId,
      name: trimmedName,
      createdAt: new Date().toISOString()
    };
    const updatedPets = [...petProfiles, newPet];
    setPetProfiles(updatedPets);
    setActivePetId(newPetId);
    setInitialVaccineFiles([]);

    persistBreederSnapshot(updatedPets, allFiles);

    if (user) {
      try {
        await userProgressService.saveProgress(user.uid, {
          pets: updatedPets,
          activePetId: newPetId,
          currentStep: currentPage,
          lastFileIds: [],
          lastFileCount: 0
        });
      } catch (error) {
        console.error('Failed to save new pet:', error);
      }
    }

    return newPetId;
  }, [allFiles, currentPage, petProfiles, persistBreederSnapshot, user]);

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      try {
        const currentUserId = user?.uid;
        await signOut(auth);
        if (currentUserId) {
          userProgressService.clearLocal(currentUserId);
        }
        setCurrentPage('main');
        setInitialVaccineFiles([]);
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
  };

  if (loading || (user && !progressLoaded)) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Show auth page if user is not logged in
  if (!user) {
    return (
      <div className="App">
        <Auth onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  // Logged in - show appropriate page
  return (
    <div className="App">
      {currentPage === 'main' ? (
        <MainPage
          user={user}
          onLogout={handleLogout}
          showLoginTip={showLoginTip}
          onDismissLoginTip={handleDismissLoginTip}
          onBeginSetup={handleBeginSetup}
          petProfiles={petProfiles}
          activePetId={activePetId}
          onPetChange={handlePetChange}
          onAddPet={handleAddPet}
          onDeletePet={handleDeletePet}
          allFiles={allFiles}
        />
      ) : currentPage === 'measure' ? (
        <Measure
          user={user}
          onNext={handleMeasureNext}
          onBack={handleMeasureBack}
          onLogout={handleLogout}
          petProfiles={petProfiles}
          activePetId={activePetId}
          onPetChange={handlePetChange}
          onAddPet={handleAddPet}
          onDeletePet={handleDeletePet}
          allFiles={allFiles}
          onDimensionsUpdate={handleDimensionsUpdate}
        />
      ) : (
        <Vaccine
          user={user}
          onNext={handleVaccineNext}
          onBack={handleVaccineBack}
          onLogout={handleLogout}
          initialFiles={initialVaccineFiles}
          onFilesChange={handleVaccineFilesChange}
          petProfiles={petProfiles}
          activePetId={activePetId}
          onPetChange={handlePetChange}
          onAddPet={handleAddPet}
          onDeletePet={handleDeletePet}
          allFiles={allFiles}
        />
      )}
    </div>
  );
}

export default App;

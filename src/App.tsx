import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase/config';
import Auth from './components/Auth';
import MainPage from './components/MainPage';
import Measure from './components/Measure';
import Vaccine from './components/Vaccine';
import userProgressService from './services/userProgressService';
import fileUploadService, { DEFAULT_PET_ID } from './services/fileUploadService';
import breederService from './services/breederService';
import { PetProfile, FileInfo, PetDimensions, PetWeightEntry } from './types';
import './App.css';
import WeightCarrier from './components/WeightCarrier';
import WeightTotal from './components/WeightTotal';

/**
 * Main App Component - Pet Passport Management System
 */

const isLegacyPetId = (petId: string | null | undefined): boolean =>
  !petId || petId === DEFAULT_PET_ID;

const buildPetProfiles = (
  progressPets: PetProfile[] = [],
  breederPets: PetProfile[] = []
): PetProfile[] => {
  const petMap = new Map<string, PetProfile>();

  const upsertPet = (pet: PetProfile) => {
    if (!pet?.id || isLegacyPetId(pet.id)) return;
    const existing = petMap.get(pet.id) || {};
    petMap.set(pet.id, {
      ...existing,
      ...pet
    });
  };

  progressPets.forEach(upsertPet);
  breederPets.forEach(upsertPet);

  return Array.from(petMap.values());
};

type PageName = 'main' | 'measure' | 'weight-carrier' | 'weight-total' | 'vaccine';

const normalizeStep = (page: string): PageName => {
  if (
    page === 'measure' ||
    page === 'weight-carrier' ||
    page === 'weight-total' ||
    page === 'vaccine'
  ) {
    return page as PageName;
  }
  return 'main';
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showLoginTip, setShowLoginTip] = useState<boolean>(false);

  const [currentPage, setCurrentPage] = useState<PageName>('main');

  const [initialVaccineFiles, setInitialVaccineFiles] = useState<FileInfo[]>([]);
  const [progressLoaded, setProgressLoaded] = useState<boolean>(false);
  const [petProfiles, setPetProfiles] = useState<PetProfile[]>([]);
  const [activePetId, setActivePetId] = useState<string | null>(null);
  const [allFiles, setAllFiles] = useState<FileInfo[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [weightEntries, setWeightEntries] = useState<Record<string, PetWeightEntry>>({});

  const persistBreederSnapshot = useCallback(
    (pets: PetProfile[], files: FileInfo[]) => {
      if (!user) return;
      breederService.saveSnapshot(user.uid, pets, files).catch((error) => {
        console.error('Failed to persist breeder snapshot:', error);
      });
    },
    [user]
  );

  useEffect(() => {
    // Listen to authentication state changes
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        console.log('User logged in:', currentUser.uid);
        const dontShowAgain = localStorage.getItem('dontShowLoginTip');
        if (!dontShowAgain) {
          setShowLoginTip(true);
        }
      } else {
        console.log('User logged out');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const syncProfile = async () => {
      if (!user || !db) return;
      try {
        await setDoc(
          doc(db, 'userProfiles', user.uid),
          {
            email: user.email || null,
            displayName: user.displayName || null,
            photoURL: user.photoURL || null,
            lastLoginAt: new Date().toISOString()
          },
          { merge: true }
        );
      } catch (error) {
        console.error('Failed to sync user profile:', error);
      }
    };

    syncProfile();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setCurrentPage('main');
      setInitialVaccineFiles([]);
      setPetProfiles([]);
      setAllFiles([]);
      setActivePetId(null);
      setWeightEntries({});
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
          setCurrentPage(
            progress.currentStep as
              | 'main'
              | 'measure'
              | 'weight-carrier'
              | 'weight-total'
              | 'vaccine'
          );
        }

        const normalizedPets = buildPetProfiles(progress?.pets, breeder?.pets);

        const fallbackWeights =
          (progress as { weightEntries?: Record<string, PetWeightEntry> } | undefined)
            ?.weightEntries || {};

        const enrichedPets = normalizedPets.map((pet) => {
          if (!pet.weight && fallbackWeights[pet.id]) {
            return {
              ...pet,
              weight: fallbackWeights[pet.id]
            };
          }
          return pet;
        });

        const desiredPetId = (() => {
          if (
            progress?.activePetId &&
            enrichedPets.some((pet) => pet.id === progress.activePetId)
          ) {
            return progress.activePetId;
          }
          return enrichedPets[0]?.id || null;
        })();

        setPetProfiles(enrichedPets);
        setActivePetId(desiredPetId);
        setAllFiles(files);
        setInitialVaccineFiles(
          desiredPetId ? files.filter((file) => file.petId === desiredPetId) : []
        );

        const initialWeights: Record<string, PetWeightEntry> = {};
        enrichedPets.forEach((pet) => {
          if (pet.weight && (pet.weight.carrier || pet.weight.total)) {
            initialWeights[pet.id] = {
              carrier: pet.weight.carrier || '',
              total: pet.weight.total || ''
            };
          }
        });
        setWeightEntries(initialWeights);

        userProgressService
          .saveProgress(user.uid, {
            currentStep: progress?.currentStep || 'main',
            pets: enrichedPets,
            activePetId: desiredPetId
          })
          .catch((error) => {
            console.error('Failed to sync progress during load:', error);
          });

        persistBreederSnapshot(enrichedPets, files);
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

  useEffect(() => {
    let cancelled = false;
    const dbInstance = db;

    const verifyAdminAccess = async () => {
      if (!user) {
        if (!cancelled) {
          setIsAdmin(false);
        }
        return;
      }

      if (!dbInstance) {
        if (!cancelled) {
          setIsAdmin(false);
        }
        return;
      }

      try {
        const adminDoc = await getDoc(doc(dbInstance, 'adminUsers', user.uid));
        if (!cancelled) {
          setIsAdmin(adminDoc.exists());
        }
      } catch (error) {
        console.error('Failed to verify admin access:', error);
        if (!cancelled) {
          setIsAdmin(false);
        }
      }
    };

    verifyAdminAccess();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    const dontShowAgain = localStorage.getItem('dontShowLoginTip');
    if (!dontShowAgain) {
      setShowLoginTip(true);
    }
  };

  const handleDismissLoginTip = (dontShowAgain: boolean) => {
    setShowLoginTip(false);
    if (dontShowAgain) {
      localStorage.setItem('dontShowLoginTip', 'true');
    }
  };

  const persistCurrentStep = useCallback(
    (step: PageName) => {
      if (!user) return;
      userProgressService
        .saveProgress(user.uid, { currentStep: step })
        .catch((error) => {
          console.error('Failed to save progress:', error);
        });
    },
    [user]
  );

  const handleBeginSetup = () => {
    if (petProfiles.length === 0) {
      alert('Please add a pet profile before continuing.');
      return;
    }
    setCurrentPage('measure');
    persistCurrentStep('measure');
  };

  const handleMeasureNext = () => {
    setCurrentPage('vaccine');
    persistCurrentStep('vaccine');
  };

  const handleMeasureBack = () => {
    setCurrentPage('main');
    persistCurrentStep('main');
  };

  const goToWeightCarrier = useCallback(() => {
    setCurrentPage('weight-carrier');
    persistCurrentStep('weight-carrier');
  }, [persistCurrentStep]);

  const handleWeightCarrierBack = useCallback(() => {
    setCurrentPage('measure');
    persistCurrentStep('measure');
  }, [persistCurrentStep]);

  const goToWeightTotal = useCallback(() => {
    setCurrentPage('weight-total');
    persistCurrentStep('weight-total');
  }, [persistCurrentStep]);

  const handleWeightTotalBack = useCallback(() => {
    setCurrentPage('weight-carrier');
    persistCurrentStep('weight-carrier');
  }, [persistCurrentStep]);

  const handleVaccineBack = () => {
    setCurrentPage('measure');
    persistCurrentStep('measure');
  };

  const handleVaccineNext = async (data: { vaccineFiles: FileInfo[] }) => {
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

  const handleVaccineFilesChange = useCallback(
    (petId: string, files: FileInfo[]) => {
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
      const dedupedFiles: FileInfo[] = [];
      const seenIds = new Set<string>();
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

      const defaultNewPetType =
        (
          petProfiles.find((pet) => pet.id === activePetId) || petProfiles[0]
        )?.type || 'cat';

      let updatedPets = petProfiles;
      if (!petProfiles.some((pet) => pet.id === normalizedPetId)) {
        const newPet: PetProfile = {
          id: normalizedPetId,
          createdAt: dedupedFiles[0]?.uploadedAt || new Date().toISOString(),
          type: defaultNewPetType
        };
        updatedPets = [...petProfiles, newPet];
        setPetProfiles(updatedPets);
      }

      const petsForSave = updatedPets;

      if (user) {
        userProgressService
          .saveProgress(user.uid, {
            currentStep: normalizeStep(currentPage),
            lastFileIds: dedupedFiles.map((file) => file.id),
            lastFileCount: dedupedFiles.length,
            pets: petsForSave,
            activePetId: normalizedPetId
          })
          .catch((error) => {
            console.error('Failed to cache user progress:', error);
          });
      }

      persistBreederSnapshot(petsForSave, nextAllFiles);
    },
    [user, currentPage, activePetId, petProfiles, allFiles, persistBreederSnapshot]
  );

  const handleDimensionsUpdate = useCallback(
    (petId: string, newDimensions: PetDimensions) => {
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
          const fallbackType = prevPets.find((pet) => pet.id === petId)?.type || 'cat';
          return [
            ...updated,
            {
              id: petId,
              createdAt: new Date().toISOString(),
              type: fallbackType,
              dimensions: newDimensions
            }
          ];
        }

        return updated;
      });
    },
    []
  );

  const handleWeightEntryUpdate = useCallback(
    (petId: string | null, entry: Partial<PetWeightEntry>) => {
      if (!petId) return;

      setWeightEntries((prev) => {
        const previous = prev[petId] || {};
        const merged = { ...previous, ...entry };
        const hasCarrier = merged.carrier !== undefined && merged.carrier !== '';
        const hasTotal = merged.total !== undefined && merged.total !== '';
        const nextEntries = { ...prev };
        if (!hasCarrier && !hasTotal) {
          delete nextEntries[petId];
        } else {
          nextEntries[petId] = merged;
        }
        return nextEntries;
      });

      setPetProfiles((prevPets) => {
        const updatedPets = prevPets.map((pet) => {
          if (pet.id !== petId) {
            return pet;
          }

          const nextWeight = { ...(pet.weight || {}) };

          if (entry.carrier !== undefined) {
            const sanitized = entry.carrier?.trim();
            if (sanitized) {
              nextWeight.carrier = sanitized;
            } else {
              delete nextWeight.carrier;
            }
          }

          if (entry.total !== undefined) {
            const sanitized = entry.total?.trim();
            if (sanitized) {
              nextWeight.total = sanitized;
            } else {
              delete nextWeight.total;
            }
          }

          const hasCarrier = !!nextWeight.carrier;
          const hasTotal = !!nextWeight.total;

          return {
            ...pet,
            weight: hasCarrier || hasTotal ? nextWeight : undefined
          };
        });

        if (user) {
          userProgressService
            .saveProgress(user.uid, {
              pets: updatedPets,
              activePetId,
              currentStep: normalizeStep(currentPage)
            })
            .catch((error) => {
              console.error('Failed to save weight entry:', error);
            });
        }

        return updatedPets;
      });
    },
    [activePetId, currentPage, user]
  );

  const handleDeletePet = useCallback(
    async (petId: string) => {
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

      const remainingPets = petProfiles.filter((pet) => pet.id !== targetPetId);
      setPetProfiles(remainingPets);

      setWeightEntries((prev) => {
        if (!prev[targetPetId]) {
          return prev;
        }
        const next = { ...prev };
        delete next[targetPetId];
        return next;
      });

      const nextActive =
        targetPetId === activePetId
          ? remainingPets[0]?.id || null
          : activePetId || remainingPets[0]?.id || null;
      setActivePetId(nextActive);

      const nextFiles = nextActive
        ? remainingFiles.filter((file) => file.petId === nextActive)
        : [];
      setInitialVaccineFiles(nextFiles);

      if (user) {
        userProgressService
          .saveProgress(user.uid, {
            pets: remainingPets,
            activePetId: nextActive,
            currentStep: normalizeStep(currentPage),
            lastFileIds: nextFiles.map((file) => file.id),
            lastFileCount: nextFiles.length
          })
          .catch((error) => {
            console.error('Failed to save progress after deleting pet:', error);
          });
      }

      persistBreederSnapshot(remainingPets, remainingFiles);
    },
    [
      activePetId,
      allFiles,
      currentPage,
      petProfiles,
      user,
      persistBreederSnapshot
    ]
  );

  const handlePetChange = useCallback(
    (petId: string) => {
      const targetPetId = petId || activePetId || petProfiles[0]?.id || null;
      if (!targetPetId) {
        setActivePetId(null);
        setInitialVaccineFiles([]);
        if (user) {
          userProgressService
            .saveProgress(user.uid, {
              activePetId: null,
              pets: petProfiles,
              currentStep: normalizeStep(currentPage)
            })
            .catch((error) => {
              console.error('Failed to save active pet:', error);
            });
        }
        return;
      }

      setActivePetId(targetPetId);
      setInitialVaccineFiles(allFiles.filter((file) => file.petId === targetPetId));

      if (user) {
        userProgressService
          .saveProgress(user.uid, {
            activePetId: targetPetId,
            pets: petProfiles,
            currentStep: normalizeStep(currentPage)
          })
          .catch((error) => {
            console.error('Failed to save active pet:', error);
          });
      }
    },
    [activePetId, allFiles, currentPage, petProfiles, user]
  );

  const handleAddPet = useCallback(
    async (pet: { name: string; type: 'cat' | 'dog' }): Promise<string | null> => {
      const trimmedName = pet?.name?.trim();
      if (!trimmedName) {
        window.alert('Pet name is required.');
        return null;
      }

      const petType: 'cat' | 'dog' = pet?.type === 'dog' ? 'dog' : 'cat';

      const newPetId = `pet_${Date.now()}`;
      const newPet: PetProfile = {
        id: newPetId,
        name: trimmedName,
        createdAt: new Date().toISOString(),
        type: petType
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
            currentStep: normalizeStep(currentPage),
            lastFileIds: [],
            lastFileCount: 0
          });
        } catch (error) {
          console.error('Failed to save new pet:', error);
        }
      }

      return newPetId;
    },
    [allFiles, currentPage, petProfiles, persistBreederSnapshot, user]
  );

  const handleUpdatePetType = useCallback(
    async (petId: string, type: 'cat' | 'dog') => {
      if (!petId || isLegacyPetId(petId)) {
        return;
      }
      let nextPets: PetProfile[] = [];
      setPetProfiles((prevPets) => {
        let found = false;
        const updated = prevPets.map((pet) => {
          if (pet.id === petId) {
            found = true;
            return { ...pet, type };
          }
          return pet;
        });
        if (!found) {
          nextPets = [
            ...updated,
            {
              id: petId,
              createdAt: new Date().toISOString(),
              type
            }
          ];
          return nextPets;
        }
        nextPets = updated;
        return updated;
      });

      if (nextPets.length === 0) {
        nextPets = petProfiles.map((pet) =>
          pet.id === petId ? { ...pet, type } : pet
        );
      }

      if (user) {
        userProgressService
          .saveProgress(user.uid, {
            pets: nextPets,
            activePetId,
            currentStep: normalizeStep(currentPage)
          })
          .catch((error) => {
            console.error('Failed to save pet type update:', error);
          });
      }
      persistBreederSnapshot(nextPets, allFiles);
    },
    [activePetId, allFiles, currentPage, petProfiles, persistBreederSnapshot, user]
  );

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      try {
        const currentUserId = user?.uid;
        if (auth) {
          await signOut(auth);
        }
        if (currentUserId) {
          userProgressService.clearLocal(currentUserId);
        }
        setCurrentPage('main');
        setInitialVaccineFiles([]);
        setWeightEntries({});
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

  if (!user) {
    return (
      <div className="App">
        <Auth onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

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
          onUpdatePetType={handleUpdatePetType}
          allFiles={allFiles}
          isAdmin={isAdmin}
        />
      ) : currentPage === 'measure' ? (
        <Measure
          user={user}
          onNext={goToWeightCarrier}
          onBack={handleMeasureBack}
          onLogout={handleLogout}
          petProfiles={petProfiles}
          activePetId={activePetId}
          onPetChange={handlePetChange}
          onAddPet={handleAddPet}
          onDeletePet={handleDeletePet}
          onUpdatePetType={handleUpdatePetType}
          allFiles={allFiles}
          onDimensionsUpdate={handleDimensionsUpdate}
          isAdmin={isAdmin}
        />
      ) : currentPage === 'weight-carrier' ? (
        <WeightCarrier
          user={user}
          onNext={goToWeightTotal}
          onBack={handleWeightCarrierBack}
          onLogout={handleLogout}
          petProfiles={petProfiles}
          activePetId={activePetId}
          onPetChange={handlePetChange}
          onAddPet={handleAddPet}
          onDeletePet={handleDeletePet}
          onUpdatePetType={handleUpdatePetType}
          allFiles={allFiles}
          isAdmin={isAdmin}
          savedCarrierWeight={
            activePetId ? weightEntries[activePetId]?.carrier ?? '' : ''
          }
          onCarrierWeightChange={(value) =>
            handleWeightEntryUpdate(activePetId, { carrier: value })
          }
        />
      ) : currentPage === 'weight-total' ? (
        <WeightTotal
          user={user}
          onNext={handleMeasureNext}
          onBack={handleWeightTotalBack}
          onLogout={handleLogout}
          petProfiles={petProfiles}
          activePetId={activePetId}
          onPetChange={handlePetChange}
          onAddPet={handleAddPet}
          onDeletePet={handleDeletePet}
          onUpdatePetType={handleUpdatePetType}
          allFiles={allFiles}
          isAdmin={isAdmin}
          savedTotalWeight={
            activePetId ? weightEntries[activePetId]?.total ?? '' : ''
          }
          onTotalWeightChange={(value) =>
            handleWeightEntryUpdate(activePetId, { total: value })
          }
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
          onUpdatePetType={handleUpdatePetType}
          allFiles={allFiles}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

export default App;

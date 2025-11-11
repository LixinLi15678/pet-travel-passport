import { PetsModalProps, PetProfile, FileInfo } from '../types';
import './PetsModal.css';

const formatDateLabel = (isoString: string | undefined): string => {
  if (!isoString) return 'Unknown date';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const buildDisplayName = (files: FileInfo[] = [], pet: PetProfile | undefined): string => {
  const referenceDate = files[0]?.uploadedAt || pet?.createdAt;
  if (!referenceDate) {
    return pet?.name || 'CAT';
  }
  const date = new Date(referenceDate);
  if (Number.isNaN(date.getTime())) {
    return pet?.name || 'CAT';
  }
  const datePart = date.toISOString().slice(0, 10);
  const petName = pet?.name || 'CAT';
  return `${datePart} ${petName}`;
};

interface ExtendedPetsModalProps extends PetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPet?: (petId: string) => void;
}

const PetsModal = ({
  isOpen,
  onClose,
  petProfiles = [],
  activePetId,
  onPetChange,
  onSelectPet,
  onAddPet,
  onDeletePet,
  allFiles = []
}: ExtendedPetsModalProps) => {
  if (!isOpen) return null;

  const resolvedActive = activePetId || petProfiles[0]?.id || null;
  const pets = petProfiles.length > 0 ? petProfiles : [];

  const getFilesForPet = (petId: string | null): FileInfo[] => {
    if (!petId) {
      return [];
    }
    return allFiles
      .filter((file) => file.petId === petId)
      .sort((a, b) => {
        const aTime = new Date(a.uploadedAt || 0).getTime();
        const bTime = new Date(b.uploadedAt || 0).getTime();
        return aTime - bTime;
      });
  };

  const handleAddPet = async (): Promise<void> => {
    if (!onAddPet) return;
    try {
      const newPetId = await onAddPet();
      if (!newPetId) {
        return;
      }
      if (onSelectPet) {
        onSelectPet(newPetId);
      } else if (onPetChange) {
        onPetChange(newPetId);
      }
      onClose();
    } catch (error) {
      console.error('Failed to add pet profile:', error);
    }
  };

  const handleSelect = (petId: string): void => {
    if (onSelectPet) {
      onSelectPet(petId);
    } else if (onPetChange) {
      onPetChange(petId);
    }
    onClose();
  };

  const handleDelete = async (petId: string, petNameLabel: string): Promise<void> => {
    if (!onDeletePet) return;
    const label = petNameLabel || 'this pet';
    if (!window.confirm(`Delete ${label}? All files inside will be removed.`)) {
      return;
    }
    await onDeletePet(petId);
  };

  const handleOverlayClick = (): void => {
    onClose();
  };

  const handleModalClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    e.stopPropagation();
  };

  const handleCloseClick = (): void => {
    onClose();
  };

  const handleAddPetClick = (): void => {
    handleAddPet();
  };

  const handleSwitchClick = (petId: string) => (): void => {
    handleSelect(petId);
  };

  const handleDeleteClick = (petId: string, displayName: string) => (): void => {
    handleDelete(petId, displayName);
  };

  return (
    <div className="pets-modal-overlay" onClick={handleOverlayClick}>
      <div className="pets-modal" onClick={handleModalClick}>
        <div className="pets-modal-header">
          <h2>Pets</h2>
          <button className="pets-close" onClick={handleCloseClick} aria-label="Close pet modal">
            ✕
          </button>
        </div>
        <p className="pets-modal-description">Switch between pet profiles to keep files organized.</p>
        <div className="pets-modal-actions">
          <button className="add-pet-button" onClick={handleAddPetClick}>
            + Add Pet
          </button>
        </div>
        <div className="pets-list">
          {pets.length === 0 ? (
            <div className="pet-empty-state">
              <p>No pets yet. Add a pet to get started.</p>
              <button className="add-pet-button" onClick={handleAddPetClick}>
                + Add Pet
              </button>
            </div>
          ) : pets.map((pet) => {
            const filesForPet = getFilesForPet(pet.id);
            const displayName = buildDisplayName(filesForPet, pet);
            return (
              <div className={`pet-card ${pet.id === resolvedActive ? 'active' : ''}`} key={pet.id}>
                <div className="pet-card-header">
                  <div>
                    <h3>{displayName}</h3>
                    <span className="pet-card-meta">{filesForPet.length} file(s)</span>
                  </div>
                  {pet.id === resolvedActive && <span className="pet-pill">Current</span>}
                </div>
                <ul className="pet-file-list">
                  {filesForPet.length === 0 && <li className="pet-file-empty">No files yet.</li>}
                  {filesForPet.map((file) => (
                    <li key={file.id} className="pet-file-item">
                      <span className="pet-file-name">{file.name}</span>
                      <span className="pet-file-date">{formatDateLabel(file.uploadedAt)}</span>
                    </li>
                  ))}
                </ul>
                <div className="pet-card-actions">
                  <button
                    className="pet-switch-button"
                    onClick={handleSwitchClick(pet.id)}
                    disabled={pet.id === resolvedActive}
                  >
                    {pet.id === resolvedActive ? 'Selected' : 'Switch to this pet'}
                  </button>
                  <button
                    className="pet-delete-button"
                    onClick={handleDeleteClick(pet.id, displayName)}
                    disabled={!onDeletePet}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PetsModal;

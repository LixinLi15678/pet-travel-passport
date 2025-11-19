import React, { useState } from 'react';
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
  onUpdatePetType,
  allFiles = []
}: ExtendedPetsModalProps) => {
  const resolvedActive = activePetId || petProfiles[0]?.id || null;
  const pets = petProfiles.length > 0 ? petProfiles : [];

  const [showAddModal, setShowAddModal] = useState(false);
  const [newPetName, setNewPetName] = useState('');
  const [newPetType, setNewPetType] = useState<'cat' | 'dog'>('cat');
  const [addError, setAddError] = useState('');
  const [addPending, setAddPending] = useState(false);

  if (!isOpen) return null;

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
    const name = newPetName.trim();
    if (!name) {
      setAddError('Name is required');
      return;
    }
    setAddPending(true);
    setAddError('');
    try {
      const newPetId = await onAddPet({ name, type: newPetType });
      if (!newPetId) {
        setAddError('Failed to create pet. Please try again.');
        return;
      }
      if (onSelectPet) {
        onSelectPet(newPetId);
      } else if (onPetChange) {
        onPetChange(newPetId);
      }
      setShowAddModal(false);
      setNewPetName('');
      setNewPetType('cat');
      onClose();
    } catch (error) {
      console.error('Failed to add pet profile:', error);
      setAddError('Failed to create pet. Please try again.');
    } finally {
      setAddPending(false);
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
    setShowAddModal(true);
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
        {showAddModal && (
          <div className="add-pet-modal">
            <div className="add-pet-row">
              <label className="add-pet-label" htmlFor="new-pet-name">Pet name</label>
              <input
                id="new-pet-name"
                className="add-pet-input"
                value={newPetName}
                onChange={(e) => setNewPetName(e.target.value)}
                placeholder="e.g., Momo"
                disabled={addPending}
              />
            </div>
            <div className="add-pet-row">
              <span className="add-pet-label">Type</span>
              <div className="pet-type-toggle-group">
                <button
                  type="button"
                  className={`pet-type-choice ${newPetType === 'cat' ? 'active' : ''}`}
                  onClick={() => setNewPetType('cat')}
                  disabled={addPending}
                >
                  Cat
                </button>
                <button
                  type="button"
                  className={`pet-type-choice ${newPetType === 'dog' ? 'active' : ''}`}
                  onClick={() => setNewPetType('dog')}
                  disabled={addPending}
                >
                  Dog
                </button>
              </div>
            </div>
            {addError && <div className="add-pet-error">{addError}</div>}
            <div className="add-pet-actions">
              <button
                type="button"
                className="add-pet-cancel"
                onClick={() => {
                  setShowAddModal(false);
                  setAddError('');
                  setNewPetName('');
                  setNewPetType('cat');
                }}
                disabled={addPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="add-pet-save"
                onClick={handleAddPet}
                disabled={addPending}
              >
                {addPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
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
            const petType = pet.type === 'dog' ? 'dog' : 'cat';
            return (
              <div className={`pet-card ${pet.id === resolvedActive ? 'active' : ''}`} key={pet.id}>
                <div className="pet-card-header">
                  <div>
                    <h3>{displayName}</h3>
                    <span className="pet-card-meta">{filesForPet.length} file(s)</span>
                  </div>
                  <div className="pet-card-header-actions">
                    {onUpdatePetType && (
                      <button
                        className={`pet-type-toggle ${petType}`}
                        onClick={() => onUpdatePetType(pet.id, petType === 'dog' ? 'cat' : 'dog')}
                        type="button"
                      >
                        {petType === 'dog' ? 'Dog' : 'Cat'}
                      </button>
                    )}
                    {pet.id === resolvedActive && <span className="pet-pill">Current</span>}
                  </div>
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

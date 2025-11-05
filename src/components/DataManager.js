import React, { useState, useEffect, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import dataService from '../services/dataService';
import fileUploadService from '../services/fileUploadService';
import FileUpload from './FileUpload';
import './DataManager.css';

/**
 * Data Manager Component - View, Add, Edit, Delete user data
 */
const DataManager = ({ user }) => {
  const [pets, setPets] = useState([]);
  const [currentPet, setCurrentPet] = useState({
    name: '',
    species: '',
    weight: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const loadAllPets = useCallback(async () => {
    if (!user?.uid) {
      setPets([]);
      return;
    }
    setLoading(true);
    try {
      const data = await dataService.loadUserData(user.uid);
      setPets(data?.pets || []);
    } catch (error) {
      console.error('Error loading pets:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAllPets();
  }, [loadAllPets]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentPet(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddOrUpdate = async () => {
    if (!currentPet.name || !currentPet.species || !currentPet.weight) {
      alert('Please fill in all fields');
      return;
    }

    const petData = {
      ...currentPet,
      files: uploadedFiles,
      updatedAt: new Date().toISOString()
    };

    let updatedPets;
    if (editingId !== null) {
      // Update existing pet
      updatedPets = pets.map((pet, index) =>
        index === editingId ? petData : pet
      );
    } else {
      // Add new pet
      updatedPets = [...pets, petData];
    }

    try {
      const success = await dataService.saveUserData(user.uid, { pets: updatedPets });
      if (success) {
        setPets(updatedPets);
        handleClear();
        alert(editingId !== null ? 'Updated successfully!' : 'Added successfully!');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Save failed');
    }
  };

  const handleEdit = (index) => {
    const pet = pets[index];
    setCurrentPet({
      name: pet.name,
      species: pet.species,
      weight: pet.weight
    });
    setUploadedFiles(pet.files || []);
    setEditingId(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (index) => {
    if (!window.confirm('Are you sure you want to delete this record?')) {
      return;
    }

    const petToDelete = pets[index];
    if (!petToDelete) {
      return;
    }

    const filesToDelete = Array.isArray(petToDelete.files) ? petToDelete.files : [];

    const updatedPets = pets.filter((_, i) => i !== index);

    try {
      const success = await dataService.saveUserData(user.uid, { pets: updatedPets });
      if (success) {
        setPets(updatedPets);
        if (editingId === index) {
          handleClear();
        }
        if (filesToDelete.length > 0) {
          try {
            await fileUploadService.deleteFiles(filesToDelete, user.uid);
          } catch (error) {
            console.error('Error deleting files for pet:', error);
          }
        }
        alert('Deleted successfully!');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Delete failed');
    }
  };

  const handleClear = () => {
    setCurrentPet({ name: '', species: '', weight: '' });
    setUploadedFiles([]);
    setEditingId(null);
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      try {
        await signOut(auth);
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
  };

  const handleFileUploadComplete = (files) => {
    setUploadedFiles(files);
  };

  return (
    <div className="data-manager">
      <header className="manager-header">
        <div className="header-content">
          <h1>Pet Travel Passport</h1>
          <div className="user-info">
            <span className="user-email">{user.email}</span>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="manager-main">
        {/* Add/Edit Form */}
        <section className="edit-section">
          <h2>{editingId !== null ? 'Edit Pet Information' : 'Add New Pet'}</h2>

          <div className="form-container">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Pet Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={currentPet.name}
                  onChange={handleInputChange}
                  placeholder="Enter pet name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="species">Species</label>
                <input
                  type="text"
                  id="species"
                  name="species"
                  value={currentPet.species}
                  onChange={handleInputChange}
                  placeholder="e.g., Dog, Cat"
                />
              </div>

              <div className="form-group">
                <label htmlFor="weight">Weight (lbs)</label>
                <input
                  type="number"
                  id="weight"
                  name="weight"
                  value={currentPet.weight}
                  onChange={handleInputChange}
                  placeholder="Enter weight"
                />
              </div>
            </div>

            <FileUpload
              userId={user.uid}
              category="pet_documents"
              onUploadComplete={handleFileUploadComplete}
              existingFiles={uploadedFiles}
            />

            <div className="button-group">
              <button onClick={handleAddOrUpdate} className="save-button">
                {editingId !== null ? 'Update Information' : 'Add Pet'}
              </button>
              {editingId !== null && (
                <button onClick={handleClear} className="cancel-button">
                  Cancel Edit
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Pet List */}
        <section className="list-section">
          <h2>My Pet List ({pets.length})</h2>

          {loading ? (
            <div className="loading">Loading...</div>
          ) : pets.length === 0 ? (
            <div className="empty-state">
              <p>No pets added yet</p>
              <p className="hint">Add your first pet using the form above!</p>
            </div>
          ) : (
            <div className="pet-grid">
              {pets.map((pet, index) => (
                <div key={index} className="pet-card">
                  <div className="pet-header">
                    <h3>{pet.name}</h3>
                    <span className="pet-species">{pet.species}</span>
                  </div>

                  <div className="pet-details">
                    <p><strong>Weight:</strong> {pet.weight} lbs</p>
                    {pet.files && pet.files.length > 0 && (
                      <p><strong>Files:</strong> {pet.files.length}</p>
                    )}
                    <p className="pet-time">
                      Updated: {new Date(pet.updatedAt).toLocaleString('en-US')}
                    </p>
                  </div>

                  <div className="pet-actions">
                    <button
                      onClick={() => handleEdit(index)}
                      className="edit-btn"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(index)}
                      className="delete-btn"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default DataManager;

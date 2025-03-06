import React, { useState, useEffect } from 'react';
import '../styles/Pendu.css';

const Pendu = () => {
  const [currentGame, setCurrentGame] = useState(null);
  const [message, setMessage] = useState("");
  const [letter, setLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);
  
  const API_URL = "http://localhost:5001";
  
  // Récupérer les données de l'utilisateur connecté
  const fetchUserData = async () => {
    try {
      // Récupérer le token d'authentification stocké dans localStorage
      const token = localStorage.getItem('token'); // ou toute autre clé que vous utilisez
      
      if (!token) {
        throw new Error("Utilisateur non connecté");
      }
      
      const response = await fetch(`${API_URL}/user/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la récupération des données utilisateur');
      }
      
      setUserData(data);
    } catch (err) {
      setError(err.message);
    }
  };
  
  // Créer une nouvelle partie
  const startNewGame = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la création d\'une nouvelle partie');
      }
      
      setCurrentGame(data.game);
      setMessage("Nouvelle partie commencée. Devinez le mot!");
      setLetter("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Deviner une lettre
  const guessLetter = async (e) => {
    e.preventDefault();
    
    if (!letter || letter.length !== 1 || !letter.match(/[a-z]/i)) {
      setMessage("Veuillez entrer une seule lettre");
      return;
    }
    
    if (!currentGame || currentGame.status !== "ongoing") {
      setMessage("Veuillez commencer une nouvelle partie");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/games/${currentGame.id}/guess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ letter: letter.toLowerCase() }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la devinette');
      }
      
      setCurrentGame(data.game);
      setMessage(data.message);
      setLetter("");
      
      // Si la partie est terminée et gagnée, rafraîchir les données utilisateur
      if (data.game.status === "won") {
        fetchUserData(); // Mettre à jour le score après une victoire
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Dessiner le pendu en fonction du nombre de tentatives restantes
  const drawHangman = (attemptsLeft) => {
    const maxAttempts = 6;
    const parts = [
      <div key="head" className="hangman-head"></div>,
      <div key="body" className="hangman-body"></div>,
      <div key="left-arm" className="hangman-left-arm"></div>,
      <div key="right-arm" className="hangman-right-arm"></div>,
      <div key="left-leg" className="hangman-left-leg"></div>,
      <div key="right-leg" className="hangman-right-leg"></div>,
    ];
    
    const partsToShow = maxAttempts - attemptsLeft;
    return (
      <div className="hangman-container">
        <div className="hangman-gallows">
          <div className="hangman-top"></div>
          <div className="hangman-rope"></div>
          <div className="hangman-vertical"></div>
          <div className="hangman-base"></div>
        </div>
        {parts.slice(0, partsToShow)}
      </div>
    );
  };
  
  // Afficher le clavier virtuel
  const renderKeyboard = () => {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
    
    return (
      <div className="keyboard">
        {alphabet.map((char) => {
          const isGuessed = currentGame?.guessedLetters?.includes(char);
          return (
            <button
              key={char}
              onClick={() => {
                setLetter(char);
                document.getElementById('letter-form').requestSubmit();
              }}
              disabled={isGuessed || currentGame?.status !== 'ongoing' || loading}
              className={`key ${isGuessed ? 'guessed' : ''}`}
            >
              {char}
            </button>
          );
        })}
      </div>
    );
  };
  
  // Démarrer une partie au chargement du composant et charger les données utilisateur
  useEffect(() => {
    fetchUserData();
    startNewGame();
  }, []);
  
  return (
    <div className="pendu-container">
      <h1>Jeu du Pendu</h1>
      
      {/* Affichage des infos utilisateur */}
      {userData && (
        <div className="user-info">
          <p>Joueur: <strong>{userData.username}</strong></p>
          <p>Score: <strong>{userData.hangman_score}</strong></p>
        </div>
      )}
      
      {error && <div className="error">{error}</div>}
      
      {currentGame && (
        <div className="game-area">
          {/* Zone de dessin du pendu */}
          {drawHangman(currentGame.attemptsLeft)}
          
          {/* Affichage du mot masqué */}
          <div className="word-display">
            {currentGame.maskedWord.split('').map((char, index) => (
              <span key={index} className="letter-box">
                {char}
              </span>
            ))}
          </div>
          
          {/* Affichage des informations de jeu */}
          <div className="game-info">
            <p>Tentatives restantes: <strong>{currentGame.attemptsLeft}</strong></p>
            <p>Lettres déjà essayées: <strong>{currentGame.guessedLetters.split('').join(', ')}</strong></p>
            <p className="game-message">{message}</p>
          </div>
          
          {/* Formulaire pour deviner une lettre */}
          <form id="letter-form" onSubmit={guessLetter} className="guess-form">
            <input
              type="text"
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              maxLength="1"
              placeholder="Entrez une lettre"
              disabled={currentGame.status !== "ongoing" || loading}
            />
            <button 
              type="submit" 
              disabled={currentGame.status !== "ongoing" || loading}
              className="guess-button"
            >
              Deviner
            </button>
          </form>
          
          {/* Clavier virtuel */}
          {renderKeyboard()}
          
          {/* Affichage du statut final */}
          {currentGame.status !== "ongoing" && (
            <div className={`game-over ${currentGame.status}`}>
              <p>{message}</p>
              <button onClick={startNewGame} className="new-game-button">
                Nouvelle partie
              </button>
            </div>
          )}
        </div>
      )}
      
      {!currentGame && !loading && (
        <button onClick={startNewGame} className="new-game-button">
          Commencer une partie
        </button>
      )}
      
      {loading && <div className="loading">Chargement...</div>}
    </div>
  );
};

export default Pendu;
import React, { useState, useEffect } from 'react';
import '../styles/Pendu.css';

import avatar1 from './avatars/edfirmi.jpeg';
import avatar2 from './avatars/jfazi.jpeg';
import avatar3 from './avatars/ychirouz.jpeg';
import avatar4 from './avatars/tpenalba.jpeg';

const avatars = [avatar1, avatar2, avatar3, avatar4];

const Pendu = ({ user, onLogout }) => {
  const [currentGame, setCurrentGame] = useState(null);
  const [message, setMessage] = useState("");
  const [letter, setLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [localScore, setLocalScore] = useState(0);
  
  const API_URL = "http://localhost:5000";
  if (!user)
    console.log("user non detected");
  else
    console.log("User object:", user);
  
  // Créer une nouvelle partie
 /* const startNewGame = async () => {
    setLoading(true);
    setError(null);
    
    // Mode invité: créer une partie locale sans appel API
    if (user.isGuest) {
      // Liste de mots pour le mode invité
      const words = ["pendu", "programmation", "javascript", "react", "python", "ordinateur", "application", "developpeur"];
      const randomWord = words[Math.floor(Math.random() * words.length)];
      
      // Créer un jeu local
      const newGame = {
        id: "local-" + Date.now(),
        word: randomWord,
        maskedWord: "_".repeat(randomWord.length),
        guessedLetters: "",
        attemptsLeft: 5,
        status: "ongoing",
        score: localScore
      };
      
      setCurrentGame(newGame);
      setMessage("Nouvelle partie commencée. Devinez le mot!");
      setLetter("");
      setLoading(false);
      return;
    }
    
    // Mode normal: appel à l'API
    try {
      const response = await fetch(`${API_URL}/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
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
  };*/

  const startNewGame = async () => {
    setLoading(true);
    setError(null);

    try {
        const response = await fetch(`${API_URL}/games`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: user.username }),  // Envoyer le nom d'utilisateur
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Erreur lors de la création d'une nouvelle partie");
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
    
    // Mode invité: logique locale
    if (user.isGuest) {
      const lowerLetter = letter.toLowerCase();
      
      // Vérifier si la lettre a déjà été devinée
      if (currentGame.guessedLetters.includes(lowerLetter)) {
        setMessage("Vous avez déjà essayé cette lettre");
        setLoading(false);
        setLetter("");
        return;
      }
      
      // Mettre à jour les lettres devinées
      const updatedGuessedLetters = currentGame.guessedLetters + lowerLetter;
      
      // Vérifier si la lettre est dans le mot
      const word = currentGame.word;
      let newMaskedWord = currentGame.maskedWord.split('');
      let isCorrectGuess = false;
      
      for (let i = 0; i < word.length; i++) {
        if (word[i] === lowerLetter) {
          newMaskedWord[i] = lowerLetter;
          isCorrectGuess = true;
        }
      }
      
      // Mise à jour des tentatives
      const newAttemptsLeft = isCorrectGuess 
        ? currentGame.attemptsLeft 
        : currentGame.attemptsLeft - 1;
      
      // Vérifier si la partie est gagnée ou perdue
      let newStatus = "ongoing";
      let newMessage = isCorrectGuess 
        ? "Bonne devinette !" 
        : "Raté ! Essayez encore.";
      
      if (newMaskedWord.join('') === word) {
        newStatus = "won";
        newMessage = "Félicitations ! Vous avez gagné !";
        setLocalScore(localScore + 10); // Ajouter des points pour une victoire
      } else if (newAttemptsLeft === 0) {
        newStatus = "lost";
        newMessage = `Dommage ! Le mot était "${word}".`;
      }
      
      // Mettre à jour l'état du jeu
      setCurrentGame({
        ...currentGame,
        maskedWord: newMaskedWord.join(''),
        guessedLetters: updatedGuessedLetters,
        attemptsLeft: newAttemptsLeft,
        status: newStatus
      });
      
      setMessage(newMessage);
      setLetter("");
      setLoading(false);
      return;
    }
    
    // Mode normal: appel à l'API
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
      user.profil_pic ? (
        <img 
          key="head" 
          src={user.profil_pic} 
          alt="Avatar Head" 
          className="hangman-head avatar-head" 
        />
      ) : (
        <div key="head" className="hangman-head"></div>
      ),
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

  // ... (reste du code inchangé)

  
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
  
  // Démarrer une partie au chargement du composant
  useEffect(() => {
    startNewGame();
  }, []);
  
  return (
    <div className="pendu-container">
      <div className="user-info">
      <div className="user-profile">
          {user.avatarId && (
            <img 
            src={avatars[user.avatarId]} 
              alt="User Avatar" 
              className="user-avatar" 
            />
          )}
        <h3>Joueur: {user.username}</h3>
        </div>
        <p>Score: {user.isGuest ? localScore : (currentGame?.score || user.win_count)}</p>
        <button onClick={onLogout} className="logout-button">Déconnexion</button>
      </div>
      
      <h1>Jeu du Pendu</h1>
      
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
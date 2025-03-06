from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import random
import os

# Créer l'application Flask
app = Flask(__name__)
CORS(app)  # Permettre les requêtes cross-origin

# Configuration de la base de données
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'pendu.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Définir les modèles
class Word(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    word = db.Column(db.String(100), nullable=False, unique=True)
    
    def to_json(self):
        return {
            "id": self.id,
            "word": self.word
        }

class Game(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    word_id = db.Column(db.Integer, db.ForeignKey('word.id'), nullable=False)
    guessed_letters = db.Column(db.String(100), default="")
    attempts_left = db.Column(db.Integer, default=6)
    status = db.Column(db.String(20), default="ongoing")
    
    # Relation avec le mot
    word = db.relationship('Word', backref='games')
    
    def to_json(self):
        return {
            "id": self.id,
            "maskedWord": self.get_masked_word(),
            "guessedLetters": self.guessed_letters,
            "attemptsLeft": self.attempts_left,
            "status": self.status
        }
    
    def get_masked_word(self):
        if not self.word:
            return ""
        
        masked = ""
        for letter in self.word.word:
            if letter in self.guessed_letters:
                masked += letter
            else:
                masked += "_"
        return masked

# Routes du jeu
@app.route("/", methods=["GET"])
def index():
    return "Jeu du Pendu API"

@app.route("/games", methods=["POST"])
def create_game():
    # Choisir un mot aléatoire
    words = Word.query.all()
    if not words:
        default_words = ["python", "flask", "react", "javascript", "html", "css", "pendu", "jeu", "programmation", "code"]
        for word in default_words:
            db.session.add(Word(word=word.lower()))
        db.session.commit()
        words = Word.query.all()
    
    random_word = random.choice(words)
    
    # Créer une nouvelle partie
    new_game = Game(word_id=random_word.id)
    db.session.add(new_game)
    db.session.commit()
    
    return jsonify({"message": "Nouvelle partie créée", "game": new_game.to_json()}), 201

@app.route("/games/<int:game_id>", methods=["GET"])
def get_game(game_id):
    game = Game.query.get(game_id)
    if not game:
        return jsonify({"message": "Partie non trouvée"}), 404
    
    return jsonify({"game": game.to_json()})

@app.route("/games/<int:game_id>/guess", methods=["POST"])
def make_guess(game_id):
    game = Game.query.get(game_id)
    if not game:
        return jsonify({"message": "Partie non trouvée"}), 404
    
    if game.status != "ongoing":
        return jsonify({"message": f"La partie est terminée. Statut: {game.status}"}), 400
    
    data = request.json
    letter = data.get("letter", "").lower()
    
    if not letter or len(letter) != 1 or not letter.isalpha():
        return jsonify({"message": "Veuillez fournir une seule lettre"}), 400
    
    # Vérifier si la lettre a déjà été devinée
    if letter in game.guessed_letters:
        return jsonify({"message": "Cette lettre a déjà été devinée", "game": game.to_json()}), 400
    
    # Ajouter la lettre aux lettres devinées
    game.guessed_letters += letter
    
    word_to_guess = game.word.word.lower()
    
    # Vérifier si la lettre est dans le mot
    if letter not in word_to_guess:
        game.attempts_left -= 1
    
    # Vérifier si la partie est gagnée
    is_word_guessed = all(letter in game.guessed_letters for letter in word_to_guess)
    
    if is_word_guessed:
        game.status = "won"
    elif game.attempts_left <= 0:
        game.status = "lost"
    
    db.session.commit()
    
    response = {
        "game": game.to_json(),
        "message": ""
    }
    
    if game.status == "won":
        response["message"] = "Félicitations ! Vous avez trouvé le mot !"
    elif game.status == "lost":
        response["message"] = f"Dommage ! Le mot était: {word_to_guess}"
    elif letter in word_to_guess:
        response["message"] = "Bonne devinette !"
    else:
        response["message"] = "Lettre incorrecte !"
    
    return jsonify(response)

@app.route("/words", methods=["GET"])
def get_words():
    words = Word.query.all()
    return jsonify({"words": [word.to_json() for word in words]})

@app.route("/words", methods=["POST"])
def add_word():
    data = request.json
    word = data.get("word")
    
    if not word:
        return jsonify({"message": "Il faut fournir un mot"}), 400
    
    # Vérifier si le mot existe déjà
    existing_word = Word.query.filter_by(word=word.lower()).first()
    if existing_word:
        return jsonify({"message": "Ce mot existe déjà"}), 400
    
    # Ajouter le nouveau mot
    new_word = Word(word=word.lower())
    try:
        db.session.add(new_word)
        db.session.commit()
        return jsonify({"message": "Mot ajouté avec succès", "word": new_word.to_json()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Erreur: {str(e)}"}), 500

# Initialiser la base de données et lancer le serveur
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        
        # Vérifier s'il y a des mots dans la base de données
        words_count = Word.query.count()
        if words_count == 0:
            # Ajouter des mots par défaut
            default_words = ["python", "flask", "react", "javascript", "html", "css", "pendu", "jeu", "programmation", "code"]
            for word in default_words:
                db.session.add(Word(word=word.lower()))
            db.session.commit()
    
    # Utiliser le port 5001 pour éviter les conflits
    app.run(debug=True, port=5001)
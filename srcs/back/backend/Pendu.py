from flask import request, jsonify
from config import app, db
from models import Word, Game, User
import random

# Routes du jeu
@app.route("/users", methods=["POST"])
def add_user():
    data = request.json
    username = data.get("username")
    
    if not username:
        return jsonify({"message": "Il faut fournir un nom d'utilisateur"}), 400
    
    # Vérifier si l'utilisateur existe déjà
    existing_user = User.query.filter_by(username=username).first()
    if existing_user:
        return jsonify({"message": "Utilisateur connecté", "user": existing_user.to_json()}), 200
    
    # Ajouter le nouvel utilisateur
    new_user = User(username=username, score=0)
    try:
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": "Utilisateur créé avec succès", "user": new_user.to_json()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Erreur: {str(e)}"}), 500

@app.route("/users/<int:user_id>", methods=["GET"])
def get_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"message": "Utilisateur non trouvé"}), 404
    
    return jsonify({"user": user.to_json()})




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


@app.route("/games", methods=["POST"])
def create_game():
    data = request.json
    username = data.get("username")  # On récupère le nom d'utilisateur
    
    if not username:
        return jsonify({"message": "Il faut fournir un nom d'utilisateur"}), 400
    
    # Vérifier si l'utilisateur existe
    user = User.query.filter_by(username=username).first()
    
    # S'il n'existe pas, on le crée
    if not user:
        user = User(username=username, score=0)
        db.session.add(user)
        db.session.commit()

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
    new_game = Game(word_id=random_word.id, user_id=user.id)
    db.session.add(new_game)
    db.session.commit()
    
    return jsonify({"message": "Nouvelle partie créée", "game": new_game.to_json(), "user": user.to_json()}), 201


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
    
    # Vérifier si la lettre est dans le mot et attribuer des points
    if letter in word_to_guess:
        # Compter combien de fois la lettre apparaît dans le mot
        occurrences = word_to_guess.count(letter)
        # Ajouter 1 point par occurrence
        game.user.score += occurrences
    else:
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

@app.route("/games", methods=["GET"])
def get_games():
    games = Game.query.all()
    return jsonify({"games": [game.to_json() for game in games]})

@app.route("/reset", methods=["POST"])
def reset_database():
    # Supprimer toutes les données existantes
    db.session.query(Game).delete()
    db.session.query(Word).delete()
    db.session.query(User).delete()
    db.session.commit()
    
    # Ajouter des mots par défaut
    default_words = ["python", "flask", "react", "javascript", "html", "css", "pendu", "jeu", "programmation", "code"]
    for word in default_words:
        db.session.add(Word(word=word.lower()))
    db.session.commit()
    
    return jsonify({"message": "Base de données réinitialisée avec succès"}), 200

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
    
    app.run(debug=True)
# ⚔ Donjon RPG

Un rogue-like tour par tour en JavaScript pur (Canvas 2D, pixel-art dessiné en code, sons synthétisés avec la Web Audio API). Aucune image ni fichier audio : tout est généré.

▶ **Jouer :** https://gninoue-dev.github.io/GameRpg/

## Le but

Descendre **10 étages** générés aléatoirement, vaincre le **Roi Gobelin** (étage 5) puis la **Liche Ancienne** (étage 10). Après la victoire, un **mode infini** permet de continuer à descendre.

## Fonctionnalités

- **Donjons procéduraux** de 40×30 cases : salles reliées par un arbre couvrant avec quelques boucles, escalier placé dans la salle la plus éloignée, caméra qui suit le joueur.
- **Champ de vision** avec ligne de vue, brouillard de guerre, éclairage dynamique et torches.
- **Tour par tour** : chaque action du joueur laisse les monstres jouer. Ils te traquent en contournant les obstacles (recherche de chemin BFS).
- **6 types d'ennemis** aux comportements différents :
  - Slime (lent, agit un tour sur deux), Chauve-souris (vol erratique), Gobelin, Squelette, Orc (à partir de l'étage 4)
  - Boss : Roi Gobelin (entre en rage à mi-vie) et Liche Ancienne (lance des rayons d'ombre à distance)
- **Combat** : coups critiques, esquives, nombres de dégâts flottants, tremblement de l'écran.
- **Équipement** : 5 armes et 5 armures à trouver dans les coffres.
- **Objets** : potions, tas d'or, fontaines de soin, pièges cachés à repérer puis désamorcer.
- **Marchand** aux étages 3, 6 et 8 : potions, amélioration d'arme et d'armure, élixir de vie.
- **Progression** : niveaux d'expérience, plusieurs montées de niveau d'un coup prises en compte.
- **Sauvegarde automatique** au début de chaque étage (bouton « Continuer »), mort définitive, records.
- Mini-carte, barre de vie du boss, journal des événements, musique procédurale.
- **Mobile** : joystick tactile et boutons d'action.

## Contrôles

| Action | Clavier | Mobile |
|---|---|---|
| Se déplacer / attaquer | Flèches ou ZQSD (WASD) : fonce sur un monstre | Joystick |
| Attaquer un ennemi adjacent | Espace | ⚔ |
| Boire une potion | H | 🧪 |
| Se reposer (5 or, aucun ennemi en vue) | R | ⛺ |
| Passer son tour | . | — |
| Mini-carte | C | — |
| Son | M | 🔊 |
| Menu / pause | Échap | ☰ |

Dans les fenêtres, les chiffres 1-9 choisissent une option (pratique chez le marchand).

## Lancer en local

Aucune dépendance : ouvre `index.html` dans un navigateur.

## Structure

```
index.html    page, HUD et contrôles
style.css     thème et mise en page responsive
data.js       monstres, équipement, boutique, réglages d'équilibrage
sprites.js    personnages et tuiles en pixel-art dessinés au canvas
map.js        génération du donjon et champ de vision
render.js     caméra, éclairage, effets, mini-carte
ui.js         HUD, journal, fenêtres
sound.js      effets sonores et musique procédurale
game.js       règles du jeu, tours, combat, IA, sauvegarde
controls.js   clavier, D-pad, joystick tactile
```

# Discord Asso

Bienvenue sur la page du bot discord associatif de l'UTT ! Grâce à lui, tu obtiendras tes rôles asso/bureau/etc automatiquement sans besoin de Tintin (un vieux à la retraite) \
Voici un petit tour des fonctionnalités de ce bot :

## Adepte de la salle asso

Le rôle _@Adepte de la salle asso_ est toujours présent. Pour permettre à des utilisateurs de l'obtenir, un administrateur doit effectuer la commande `/adepte` dans un channel (public). Le bot envoie alors un message avec un bouton. Ce bouton permet de s'ajouter ou de s'enlever le rôle `@Adepte de la salle asso`.

## Attribution auto des rôles

Attribue les rôles aux membres des assos : bureau (nécessite que l'utilisateur soit dans le groupe "Bureau"), ancien (l'utilisateur doit être dans le groupe "Anciens") ou membre (dans les autres cas).
Certains rôles spéciaux sont attribués à certaines conditions (rôles apraissant sous le format `assoId-group` _- eg. ung-SIA -_ dans les variables d'environnement, séparés `;` ou `,`)

Chaque association contrôle alors une catégorie et obtient plusieurs rôles. Tous les rôles et catégories sont triées par ordre alphabétique, cependant pour les rôles bureau et les catégories, il est possible de les "épingler" en les déplaçant vers le haut. _(nb: "épingler" signifie qu'aucun nouveau channel ou rôle n'ira s'insérer au dessus)_

## Accès aux channels des assos

Si un utilisateur du discord asso veut accéder aux channels publics d'une asso, il peut le faire en utilisant le bot ! Pour cela, un admin devra avoir effectué la commande `/update-command` dans un channel (public). Cette commande génère un message avec un bouton qui permet de rejoindre les channels publics d'une asso en tant que visiteur. Après avoir cliqué sur le bouton, l'utilisateur sera invité à remplir un champ texte avec le nom d'une asso (telle qu'elle apparait sur le site étu - non sensible à la casse) ou l'id d'une asso (heureusement sinon personne n'irait visiter les channels de l'ung !)

## Faire tourner le bot directement avec `yarn start`

Il faut faut bien remplir les variables d'environnement. Ensuite exécuter `yarn build`. Si tu veux utiliser les slash commands, exécute `node build/command.js` pour enregistrer les commandes dans discord. Ensuite tu peux lancer le bot avec `yarn start`. \
**Les variables d'environnement `DISCORD_TOKEN` et `BOT_ID` sont nécessaires afin d'enregistrer les commandes dans discord !**

### TL;DR

Modifier les valeurs du fichier `.env` puis :

```sh
yarn
yarn build
node build/command.js
yarn start
```

### Docker

Il faut utiliser les variables d'environnement `DISCORD_TOKEN` et `BOT_ID` pendant la build de l'image docker. Les variables du `.env` sont utilisées (à part la première) lors de l'exécution du programme.

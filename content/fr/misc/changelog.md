# Journal des modifications

## [2025.11.3] - 2025-11-11

### Nouvelles fonctionnalités
- **Cri KOI-KOI animé**: Ajout d'un composant de cri animé qui s'affiche lorsqu'un joueur appelle "KOI-KOI", avec l'avatar du joueur et une icône de pièce animée pour une expérience visuelle plus engageante.

### Corrections de bugs
- **Lien de connexion**: Correction d'un problème avec le lien de connexion.
- **Manche après pioche**: Correction de la progression de la manche après avoir pioché des cartes.
- **Ordre d'affichage de la feuille de cartes**: Correction de l'ordre d'affichage des cartes dans la feuille de cartes et correction de la visibilité de l'icône de déclenchement.

## [2025.11.2] - 2025-11-09

### Nouvelles fonctionnalités
- **Pause audio intelligente**: La musique de fond se met désormais automatiquement en pause lorsque vous passez à un autre onglet ou minimisez la fenêtre, et reprend lorsque vous revenez au jeu. Cela permet d'économiser les ressources système et offre une meilleure expérience en multitâche.
- **Interface utilisateur de collection de cartes améliorée**: La collection de cartes propose désormais des vues en grille et un aperçu de la feuille de cartes, ce qui facilite la navigation et l'examen de votre collection.
- **Page de classements améliorée**: La page de classements comprend désormais de nouveaux graphiques et affiche la position actuelle du joueur, offrant un meilleur contexte pour votre classement.
- **Synchronisation des effets sonores améliorée**: Les effets sonores sont désormais joués avec une meilleure synchronisation pour une expérience audio plus réactive.

### Améliorations de l'interface utilisateur et de l'expérience
- **Mises à jour de la page de classements**: Couleurs et mise en page mises à jour sur la page de classements pour une meilleure cohérence visuelle et lisibilité.
- **Améliorations des graphiques de statistiques**: Correction des couleurs de fond des graphiques en anneau et amélioration du rembourrage des segments de graphique pour une meilleure clarté visuelle.
- **Style du panneau d'options**: Amélioration du style de navigation par onglets dans le panneau d'options du jeu pour une interface plus soignée.
- **Améliorations des animations de cartes**: Extraction des styles d'animation de cartes vers une classe utilitaire globale pour une meilleure cohérence et maintenabilité.

### Corrections de bugs
- **Correction de la superposition modale**: Correction de la syntaxe du style d'opacité de la superposition modale pour un rendu correct.
- **Sécurité des types et liens d'artistes**: Amélioration de la sécurité des types et correction des problèmes de visibilité des liens d'artistes.

### Améliorations des performances et techniques
- **Consolidation des jeux d'icônes**: Consolidation des jeux d'icônes et mise à jour de la configuration pour une meilleure organisation et un support hors ligne.
- **Mises à niveau du framework**: Mise à niveau vers Nuxt v4 et Tailwind CSS v4 pour des performances améliorées, une meilleure expérience développeur et l'accès aux dernières fonctionnalités.

## [2025.11.1] - 2025-11-03

### Nouvelles fonctionnalités
- **Support des applications web progressives (PWA)**: Le nouveau Hanafuda peut désormais être installé comme une application autonome sur votre appareil ! Profitez d'une expérience similaire à celle d'une application native avec des capacités de jeu hors ligne et des performances améliorées grâce à la mise en cache intelligente des ressources.
- **Modales de statistiques améliorées**: Les modales de statistiques affichent désormais les plages de dates pour les données suivies et incluent le ratio de succès Koi-Koi au centre du graphique en anneau, vous donnant un meilleur contexte pour vos métriques de performance au fil du temps.
- **Support des icônes hors ligne**: Tous les jeux d'icônes ont été consolidés et configurés pour un accès hors ligne, garantissant une expérience fluide même sans connexion internet.

### Améliorations de l'interface utilisateur et de l'expérience
- **Optimisation mobile**: Les appareils mobiles utilisent désormais par défaut la petite taille de carte pour une utilisation optimale de l'écran.
- **Préchargement intelligent des médias**: Les fichiers audio et les images de cartes sont désormais préchargés intelligemment au démarrage du jeu, réduisant les temps de chargement et assurant un gameplay plus fluide.
- **Synchronisation du mode couleur**: La préférence du mode sombre se synchronise désormais correctement lors de l'exécution de l'application en mode PWA autonome.

### Améliorations des performances et techniques
- **Service Worker moderne**: Implémentation d'un service worker basé sur Workbox avec des stratégies de mise en cache intelligentes pour des temps de chargement plus rapides et une fonctionnalité hors ligne fiable.
- **Chargement d'actifs optimisé**: Suppression du chargement paresseux des composants pour améliorer la stabilité du mode hors ligne et le comportement de chargement prévisible.

### Améliorations de l'interface utilisateur et visuelles
- **Schéma de couleurs raffiné**: Palette de couleurs mise à jour dans les panneaux de statistiques pour une meilleure cohérence visuelle et lisibilité.

## [2025.11.0] - 2025-11-02

### Nouvelles fonctionnalités
- **Panneau de statistiques amélioré**: Statistiques des joueurs repensées avec des ventilations visuelles interactives. Toutes les cartes de statistiques comportent désormais des mini-graphiques en anneau montrant la distribution des données en un coup d'œil, et cliquer sur n'importe quelle carte ouvre une modale détaillée avec des ventilations complètes. Ajout du suivi des "Parties jouées" en plus des "Manches jouées" pour distinguer les résultats globaux des matchs et les performances individuelles des manches. Les catégories de statistiques incluent les cartes capturées par type, les Yaku complétés, les résultats des appels Koi-Koi, les résultats des manches jouées et les résultats des parties jouées.

### Corrections de bugs
- **Enregistrements de jeu**: Correction d'un problème où la fin d'une partie enregistrait incorrectement à la fois une victoire et une défaite, entraînant des statistiques inexactes. La fin de partie met désormais correctement à jour l'enregistrement une seule fois avec le bon résultat.
- **Sécurité des sauvegardes de jeu**: Amélioration de la fonctionnalité de sauvegarde de jeu avec des données de carte chiffrées pour empêcher la visibilité en texte clair et la manipulation potentielle des états de jeu sauvegardés.

## [2025.10.1] - 2025-10-30

### Mises à jour du projet
- **Schéma de versionnage**: Migration du versionnage sémantique (SemVer) vers le versionnage calendaire (CalVer) en utilisant le format AAAA.MM.MICRO. Les numéros de version reflètent désormais la date de sortie et la séquence au cours de ce mois.

### Nouvelles fonctionnalités
- **Système de profil local-first**: Implémentation d'une architecture fondamentale local-first pour les profils de joueurs. Le jeu fonctionne désormais principalement sur des données locales avec une infrastructure de synchronisation de profil améliorée, une résolution des conflits améliorée avec le suivi des sources, et des transitions plus robustes des comptes invités aux comptes authentifiés. Ce travail de base permet une meilleure intégrité des données et prépare le terrain pour de futures capacités hors ligne.
- **Suivi des statistiques des joueurs**: Ajout d'un système complet de suivi des statistiques qui enregistre et affiche les métriques de performance des joueurs. Suivez vos victoires, défaites, taux de victoire, combinaisons de yaku préférées et historique de jeu au fil du temps. Les statistiques sont automatiquement sauvegardées et synchronisées sur tous les appareils pour les joueurs authentifiés.

## [2.6.1] - 2025-09-25

### Corrections de bugs
- **Gestion de l'état du jeu**: Correction d'un problème où l'abandon d'une partie et le démarrage d'une nouvelle laissaient les magasins de jeu dans un état incohérent, entraînant la désactivation d'éléments de l'interface utilisateur comme le bouton de déconnexion et la corruption de l'état du jeu. Tous les magasins de jeu se réinitialisent désormais correctement à leur état initial lors du démarrage d'une nouvelle partie.

## [2.6.0] - 2025-09-21

### Nouvelles fonctionnalités
- **Journal d'événements à l'écran**: Ajout d'un panneau de journal d'événements redimensionnable et escamotable qui suit toutes les actions du jeu en temps réel. Les joueurs peuvent désormais surveiller leurs mouvements, les pioches de cartes, les correspondances et les complétions de yaku avec des horodatages et des indicateurs visuels de cartes. Le panneau peut être repositionné, réduit ou entièrement masqué selon les préférences du joueur, avec des paramètres automatiquement sauvegardés entre les sessions.

## [2.5.1] - 2025-09-03

### Corrections de bugs et améliorations
- **Gestion de l'état du jeu**: Correction d'un problème où les parties pouvaient être sauvegardées pendant le tour de l'adversaire, garantissant que la fonctionnalité de sauvegarde n'est disponible que pendant le tour du joueur.
- **Reprise du jeu automatique**: Correction de la fonctionnalité d'adversaire automatique pour qu'elle démarre correctement lors de la reprise d'une partie après un rafraîchissement de page.
- **Persistance du jeu**: Clarification de la documentation concernant le comportement de persistance des sauvegardes de jeu.

### Améliorations de l'interface utilisateur et visuelles
- **Amélioration des modales**: Amélioration des arrière-plans des modales et des visuels des boutons pour une meilleure expérience utilisateur.

## [2.5.0] - 2025-08-31

### Nouvelles fonctionnalités
- **Sauvegarder et reprendre la partie**: Système complet de persistance de l'état du jeu permettant aux joueurs de sauvegarder leur progression et de la reprendre plus tard. Comprend des mesures anti-abus de sauvegarde avec un système de slot de sauvegarde unique qui efface automatiquement les sauvegardes lorsqu'elles sont reprises.
- **Support de la langue russe**: Ajout du russe (ru) comme nouvelle option linguistique avec des traductions complètes pour tout le contenu du jeu, les menus et les éléments de l'interface utilisateur.

### Améliorations des performances et techniques
- **Optimisation des actifs statiques**: Amélioration des performances de chargement en servant les actifs statiques à partir d'un compartiment de stockage dédié, réduisant les temps de chargement et l'utilisation de la bande passante.

### Améliorations de l'interface utilisateur et de l'expérience
- **Amélioration de l'écran de démarrage**: Remplacement de l'image statique "Jouer maintenant" par un bouton stylisé et traduisible pour améliorer le support de l'internationalisation et l'accessibilité.
- **Dimensionnement réactif des cartes**: Les paramètres de taille des cartes s'appliquent globalement tout en préservant des mises en page spécifiques pour les composants de l'interface utilisateur, garantissant une expérience utilisateur cohérente sur différentes tailles d'écran.

## [2.4.2] - 2025-08-27

### Analyse et confidentialité
- **Intégration PostHog**: Remplacement de Firebase Analytics par PostHog pour une meilleure analyse axée sur la confidentialité et des informations sur les utilisateurs.

### Améliorations du système audio
- **Intégration des commandes multimédia**: La musique de fond affiche désormais les métadonnées de la piste dans les commandes multimédia de l'appareil (iOS/Android/ordinateur de bureau).
- **Performances audio**: Ajout de formats audio de secours pour une meilleure compatibilité avec les navigateurs et d'effets sonores de cartes supplémentaires.

## [2.4.1] - 2025-08-20

### Corrections de bugs
- **Design des cartes**: Le design de carte sélectionné persiste désormais correctement entre les sessions.
- **Localisation**: Ajout des traductions manquantes des messages toast et correction du routage basé sur la locale.

## [2.4.0] - 2025-08-20

### Internationalisation et contenu
- **Support de la langue polonaise**: Ajout du polonais (pl) comme nouvelle option linguistique.
- **Pages de contenu localisées**: Implémentation des traductions pour les pages de contenu statique.
- **Traductions des métadonnées de page**: Ajout du support i18n pour les métadonnées de page.
- **Traductions du pied de page**: Ajout des traductions manquantes pour les pieds de page.
- **Structure du contenu**: Mise à jour de la structure du répertoire de contenu pour mieux supporter les traductions.

### Interface utilisateur et expérience
- **Transitions de page**: Suppression des transitions de page globales et du défilement fluide pour une sensation plus native.

## [2.3.3] - 2025-08-16

### Améliorations du système audio

- **Raffinement du système audio**: Introduction de commandes de volume et de désactivation séparées pour la musique de fond (BGM) et les effets sonores (SFX).
- **Optimisation des ressources**: Remplacement de la fonctionnalité de sourdine par une option "désactiver" pour les pistes audio, les empêchant de jouer en arrière-plan lorsqu'elles sont désactivées.
- **Reprise audio améliorée**: Correction d'un problème où la musique de fond ne reprenait pas après avoir été réactivée à partir d'un état désactivé.

## [2.3.2] - 2025-07-27

### Nouvelles fonctionnalités
- **Nouveau design de carte**: Ajout du design de carte "Shou Suisaiga" par l'utilisateur Discord Vulume.

## [2.3.1] - 2025-07-23

### Corrections de bugs
- **Traductions**: Ajout des traductions manquantes pour les types de cartes.
- **Interface utilisateur**: Amélioration de l'espacement dans le message de la modale de résultats.
- **Interface utilisateur**: Mise à jour des boutons de l'écran de démarrage pour minimiser l'encombrement.
- **Classement**: Correction du défilement du tableau sur les appareils mobiles.

## [2.3.0] - 2025-07-22

### Nouvelles fonctionnalités
- **Classements des joueurs**: Une nouvelle page a été ajoutée pour afficher les classements des joueurs.

### Corrections de bugs
- **Attributions**: Correction d'une faute de frappe dans le nom d'un contributeur sur la page des attributions.

## [2.2.0] - 2025-07-20

### Nouvelles fonctionnalités
- **Internationalisation**: Support complet de la localisation en anglais et en japonais avec un changement de langue fluide.
- **Amélioration de Tsuki-fuda**: Les cartes sont désormais affichées selon l'arrangement artistique voulu par le concepteur original.
- **Système de traduction**: Couverture de traduction complète pour les options d'affichage, les descriptions de yaku et les composants de collection.

### Améliorations de l'interface utilisateur et de l'expérience
- **Réactivité mobile**: Expérience mobile améliorée avec un positionnement des modales, une mise à l'échelle de la barre d'état et une gestion du débordement des mains améliorés.
- **Polissage de l'interface**: Icônes plein écran mises à jour, mises en page des modales raffinées et présentation des composants de collection améliorée.

### Corrections de bugs
- **Système d'avatar**: Correction des problèmes de sélection et d'attribution aléatoire d'avatars.
- **Contrôles du jeu**: Résolution des problèmes de visibilité des boutons pendant les états de fin de partie.
- **Corrections de mise en page**: Correction de divers problèmes de positionnement et de débordement sur différentes tailles d'écran.

### Performances et technique
- **Optimisation des images**: Conversion continue en WebP pour des performances de chargement améliorées.
- **Qualité du code**: Refactorisation de la gestion de l'état de l'avatar et mise à jour des dépendances.

## [2.1.1] - 2025-07-19

### Améliorations
- **Performances**: Optimisation des images de cartes et d'arrière-plan en les convertissant en WebP et en déplaçant les actifs vers un compartiment statique pour un chargement plus rapide.
- **Interface utilisateur réactive**: La barre d'état s'adapte désormais plus efficacement aux différentes tailles d'écran.
- **Gestion des avatars**: Refactorisation de la gestion de l'état des avatars pour une meilleure cohérence.

### Corrections de bugs
- **Sélection d'avatar**: Restauration de la gamme complète d'options d'avatar.

### Divers
- **Outils**: Ajout d'un script utilitaire pour le téléchargement d'actifs.

## [2.1.0] - 2025-07-17

### Améliorations de l'interface utilisateur et de la mise en page
- **Mise en page simplifiée**: La mise en page principale du jeu a été simplifiée pour une présentation plus claire et plus intuitive.
- **Barres de défilement améliorées**: Les styles des barres de défilement ont été mis à jour pour une meilleure cohérence et un aspect plus moderne.
- **Rembourrage ajusté**: Le rembourrage a été ajusté avec précision sur divers composants pour améliorer l'équilibre visuel.
- **Modale de collection plus large**: La modale pour visualiser les collections de cartes est désormais plus large, ce qui facilite la visualisation de vos cartes.
- **Crédit d'artiste**: Un composant dédié a été ajouté pour créditer correctement les artistes des designs de cartes.

### Améliorations du gameplay
- **Accès à la liste Yaku**: Les joueurs peuvent désormais ouvrir la liste Yaku pendant la décision d'appel "koi-koi" pour revoir les mains potentielles.

### Corrections de bugs
- **Bouton "Afficher le plateau"**: Correction d'un problème où le bouton "Afficher le plateau" dans le jeu ne fonctionnait pas correctement.

## [2.0.0] - 2025-07-10

### Annonces et social
- **Système d'annonces "Quoi de neuf"** avec suivi des impressions (vues/j'aime)
- **Fonctionnalité "J'aime/Je n'aime pas"** pour les annonces avec stockage local

### Expérience audio
- **Musique de fond adaptative** qui réagit à l'état du jeu
- **Transitions audio en fondu enchaîné** entre la musique du menu et celle du jeu

### Design visuel et personnalisation
- **Design de carte Otwarte Karty** - convivial pour les débutants et magnifique
- **Meilleure organisation des designs** avec une structure Nouveau → Déverrouillé → Verrouillé
- **Tailles de cartes ajustables** pour s'adapter aux différents écrans et préférences
- **Design visuel amélioré** avec des arrière-plans et une cohérence de l'interface utilisateur améliorés
- **Hiérarchie visuelle** dans les designs de cartes pour une reconnaissance plus facile

### Améliorations du gameplay
- **Visualisation de la collection** avec bouton loupe et support du double-clic
- **Composant DeckShowcase** avec fonctionnalité de révélation automatique
- **Visibilité et proéminence des cartes** pendant le jeu
- **Expérience de visualisation de la collection** avec des options d'affichage étendues

### Interface et accessibilité
- **Mises en page des menus et des modales** pour une meilleure convivialité et accessibilité
- **Accessibilité** sur tous les types d'appareils

---
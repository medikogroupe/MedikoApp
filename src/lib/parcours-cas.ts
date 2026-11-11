export type Gravite = "LEGER" | "MODERE" | "GRAVE" | "CRITIQUE";

export type Choix = {
  texte: string;
  /** Variation de la santé du patient : +5 bon, -10 moyen, -20 ou -30 mauvais. */
  effet: number;
  /** Erreur mortelle : le patient décède immédiatement. */
  fatal?: boolean;
  /** Explication montrée à l'étudiant après son choix. */
  retour: string;
};

export type Etape = { moment: string; situation: string; choix: Choix[] };

export type Cas = {
  id: string;
  titre: string;
  gravite: Gravite;
  duree: string;
  /** Nom du fichier icone 3D (public/jeux/icones, sans extension). */
  icone: string;
  /** Silhouette du patient : enfant, bebe, homme, femme ou enceinte. */
  avatar?: string;
  patient: string;
  resume: string;
  finBonne: string;
  finMoyenne: string;
  finMauvaise: string;
  etapes: Etape[];
};

export const CAS: Cas[] = [
  {
    id: "paludisme-grave-enfant",
    titre: "Fièvre et convulsion chez un enfant",
    gravite: "GRAVE",
    duree: "1 semaine de suivi",
    icone: "moustique",
    avatar: "enfant",
    patient: "Koffi, 4 ans",
    resume: "Un enfant arrive somnolent après une convulsion. Saurez-vous le sauver ?",
    finBonne: "Koffi sort guéri au bout d'une semaine, sans séquelle. Votre rapidité et vos bons choix lui ont sauvé la vie.",
    finMoyenne: "Koffi survit, mais son hospitalisation est longue et des complications sont apparues à cause de choix tardifs ou inadaptés. Relisez les corrections pour voir comment les éviter.",
    finMauvaise: "Koffi n'a pas survécu. Dans le paludisme grave de l'enfant, chaque heure compte : le tri, la glycémie, le traitement injectable et la gestion des complications font la différence. Relisez les corrections et recommencez.",
    etapes: [
      {
        moment: "Jour 0 · Accueil et tri",
        situation: "Une mère arrive à pied au centre de santé avec Koffi, 4 ans. Fièvre depuis 3 jours, vomissements, et une convulsion dans le véhicule. L'enfant est très somnolent. La salle d'attente est pleine.",
        choix: [
          {
            texte: "Le prendre en charge tout de suite en salle d'urgence : prise des constantes et surveillance rapprochée.",
            effet: 5,
            retour: "Une convulsion et une somnolence chez un enfant fébrile sont des signes de danger. Le tri se fait à l'arrivée et l'enfant passe devant tous les autres.",
          },
          {
            texte: "Lui demander de patienter dans la file et de régler d'abord son dossier.",
            effet: -30,
            retour: "Le tri doit se faire avant toute formalité administrative. Un enfant en danger ne fait pas la queue : chaque minute perdue aggrave son état.",
          },
          {
            texte: "Donner un antipyrétique par la bouche et le renvoyer à la maison.",
            effet: -30,
            fatal: true,
            retour: "Renvoyer à domicile un enfant qui présente des signes de danger, sans examen ni contrôle de la glycémie, est une erreur grave. Koffi s'aggrave pendant le trajet et n'arrive pas à temps.",
          },
        ],
      },
      {
        moment: "Jour 0 · Premiers gestes",
        situation: "Sous vos yeux, Koffi refait une convulsion. Sa respiration est bruyante.",
        choix: [
          {
            texte: "Le mettre en position latérale de sécurité, dégager les voies aériennes, donner de l'oxygène si disponible et contrôler la glycémie capillaire.",
            effet: 5,
            retour: "Protéger les voies aériennes est la priorité. La glycémie se contrôle tout de suite, car l'hypoglycémie est une cause fréquente et traitable de convulsion.",
          },
          {
            texte: "Lui faire boire de l'eau sucrée et lui donner un comprimé de paracétamol.",
            effet: -30,
            retour: "Rien par la bouche pendant une convulsion ou chez un enfant somnolent : le risque de fausse route (inhalation) est majeur.",
          },
          {
            texte: "Lui mettre un objet dans la bouche pour qu'il ne se morde pas la langue.",
            effet: -20,
            retour: "Geste dangereux et inutile : risque de blessure et d'obstruction des voies aériennes.",
          },
        ],
      },
      {
        moment: "Jour 0 · Diagnostic",
        situation: "La convulsion s'arrête. La glycémie capillaire est normale. Koffi reste fébrile et somnolent. Vous êtes dans une zone où le paludisme est fréquent.",
        choix: [
          {
            texte: "Réaliser un test de diagnostic rapide du paludisme (ou une goutte épaisse), mesurer l'hémoglobine et poursuivre la surveillance de la glycémie.",
            effet: 5,
            retour: "Dans une zone d'endémie, toute fièvre chez l'enfant doit faire rechercher le paludisme. Le test rapide est positif. L'hémoglobine renseigne sur une éventuelle anémie.",
          },
          {
            texte: "Traiter comme une simple infection virale et attendre 48 heures.",
            effet: -20,
            retour: "Attendre retarde le traitement d'un paludisme grave. Un enfant qui convulse et qui est somnolent ne peut pas être surveillé « à la maison ».",
          },
          {
            texte: "Débuter un antibiotique seul, sans autre examen.",
            effet: -20,
            retour: "Une infection bactérienne reste possible, mais l'antibiotique seul ne traite pas le paludisme et le test est rapide et indispensable.",
          },
        ],
      },
      {
        moment: "Jour 0 · Traitement",
        situation: "Le test est positif. Avec les convulsions et la somnolence, il s'agit d'un paludisme grave. Koffi ne peut pas avaler correctement.",
        choix: [
          {
            texte: "Débuter sans attendre un traitement injectable : artésunate par voie intraveineuse ou intramusculaire, à la dose adaptée à son poids.",
            effet: 5,
            retour: "L'artésunate injectable est le traitement de première intention du paludisme grave (recommandation de l'OMS). La dose se calcule selon le poids, sans retard.",
          },
          {
            texte: "Écraser des comprimés d'antipaludique et les lui faire avaler.",
            effet: -30,
            retour: "Un enfant somnolent ou qui convulse ne peut pas avaler sans risque, et l'absorption est incertaine. Le paludisme grave exige un traitement injectable.",
          },
          {
            texte: "Donner des corticoïdes pour réduire l'œdème cérébral.",
            effet: -30,
            retour: "Les corticoïdes ne sont pas recommandés dans le paludisme cérébral : ils n'améliorent pas l'évolution et peuvent être nocifs.",
          },
        ],
      },
      {
        moment: "Jour 1 · Complication",
        situation: "Le lendemain, Koffi est en sueur, très pâle, et redevient somnolent. La glycémie capillaire est basse.",
        choix: [
          {
            texte: "Corriger l'hypoglycémie par du glucose intraveineux, recontrôler la glycémie et poursuivre un apport en glucose.",
            effet: 5,
            retour: "L'hypoglycémie est fréquente dans le paludisme grave de l'enfant. Non corrigée, elle peut causer des lésions cérébrales ou la mort.",
          },
          {
            texte: "Attendre : c'est l'effet normal du traitement.",
            effet: -30,
            retour: "Une hypoglycémie n'est jamais « normale » : sans correction, elle met la vie de l'enfant en danger.",
          },
          {
            texte: "Lui donner de grandes quantités d'eau à boire.",
            effet: -20,
            retour: "L'eau ne corrige pas l'hypoglycémie, et un enfant somnolent risque la fausse route.",
          },
        ],
      },
      {
        moment: "Jour 2 · Anémie",
        situation: "Le bilan montre une anémie sévère. Koffi est pâle, respire vite et son cœur bat rapidement.",
        choix: [
          {
            texte: "Transfuser du sang selon les critères de gravité du protocole national et surveiller la tolérance (cœur, respiration).",
            effet: 5,
            retour: "L'anémie sévère est une cause majeure de décès dans le paludisme de l'enfant. La transfusion est indiquée selon les seuils du protocole, avec surveillance.",
          },
          {
            texte: "Donner du fer par voie orale et attendre.",
            effet: -20,
            retour: "Le fer oral ne corrige pas rapidement une anémie aiguë sévère et ne remplace pas la transfusion quand elle est indiquée.",
          },
          {
            texte: "Faire passer de grands volumes de sérum salé en perfusion rapide.",
            effet: -20,
            retour: "Chez l'enfant impaludé sans choc, les grands remplissages rapides ne sont pas recommandés : risque de surcharge.",
          },
        ],
      },
      {
        moment: "Jour 3 · Relais du traitement",
        situation: "Koffi est éveillé, il mange et il joue un peu. Il a reçu au moins 24 heures de traitement injectable.",
        choix: [
          {
            texte: "Passer à un traitement complet par une association à base d'artémisinine (CTA) par voie orale.",
            effet: 5,
            retour: "Après au moins 24 heures de traitement injectable et une amélioration, on termine avec une cure complète de CTA par voie orale.",
          },
          {
            texte: "Arrêter tous les médicaments puisque la fièvre est tombée.",
            effet: -20,
            retour: "Un traitement incomplet expose à la rechute (recrudescence). La baisse de la fièvre ne signifie pas que les parasites ont disparu.",
          },
          {
            texte: "Donner une seule prise de CTA par voie orale, puis arrêter.",
            effet: -20,
            retour: "Une seule prise ne suffit pas : la cure doit être complète pour éliminer les parasites.",
          },
        ],
      },
      {
        moment: "Jour 7 · Sortie et prévention",
        situation: "Koffi est prêt à sortir. Sa mère vous demande ce qu'elle doit faire à la maison.",
        choix: [
          {
            texte: "Lui expliquer les signes d'alerte (fièvre, vomissements, somnolence), vérifier l'usage d'une moustiquaire imprégnée et planifier un contrôle.",
            effet: 5,
            retour: "L'éducation de la famille et la prévention (moustiquaire imprégnée) réduisent le risque de nouvel épisode. Le suivi permet de repérer vite une rechute.",
          },
          {
            texte: "Le laisser sortir sans conseil : la mère connaît déjà le paludisme.",
            effet: -10,
            retour: "Une sortie sans explications, sans prévention et sans suivi expose l'enfant à une nouvelle infection grave.",
          },
          {
            texte: "Lui dire de revenir seulement si l'enfant refait une convulsion.",
            effet: -10,
            retour: "Il faut revenir dès les premiers signes (fièvre, vomissements, somnolence), pas attendre une convulsion.",
          },
        ],
      },
    ],
  },
];
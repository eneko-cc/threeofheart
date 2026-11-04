/**
 * Rayons de la liste de courses, dans l'ordre d'un passage en magasin.
 * Chaque mot est comparé sans accents au début des mots de l'article (« tomate » trouve « tomates »).
 * Les expressions de plusieurs mots passent avant les mots seuls (« tomates concassées » va à l'épicerie),
 * puis le mot le plus à gauche l'emporte (« jus de citron » va aux boissons, « huile d'olive » à l'épicerie).
 */
export const AISLES: { id: string; label: string; emoji: string; words: string[] }[] = [
  { id: 'fl', label: 'Fruits et légumes', emoji: '🥦', words: [
    // fruits
    'fruit', 'jus de citron', 'zeste de citron', 'pomme', 'poire', 'banane', 'orange', 'citron', 'citron vert', 'lime', 'clementine', 'mandarine', 'pamplemousse', 'kiwi', 'fraise', 'framboise',
    'myrtille', 'mure', 'cassis', 'groseille', 'cerise', 'raisin', 'mangue', 'ananas', 'papaye', 'passion', 'grenade', 'litchi', 'peche', 'nectarine', 'brugnon',
    'abricot', 'prune', 'mirabelle', 'figue', 'melon', 'pasteque', 'coing', 'kaki', 'datte fraiche', 'noix de coco', 'coco',
    // légumes
    'legume', 'avocat', 'tomate', 'tomate cerise', 'salade', 'laitue', 'roquette', 'mache', 'mesclun', 'endive', 'frisee', 'batavia', 'sucrine', 'cresson',
    'carotte', 'oignon', 'oignon rouge', 'echalote', 'ail', 'cebette', 'ciboule', 'courgette', 'poivron', 'piment', 'champignon', 'champignons de paris', 'cepe',
    'girolle', 'shiitake', 'pleurote', 'patate', 'patate douce', 'pomme de terre', 'pommes de terre', 'grenaille', 'concombre', 'epinard', 'brocoli', 'chou',
    'chou fleur', 'chou rouge', 'chou kale', 'kale', 'choux de bruxelles', 'aubergine', 'poireau', 'radis', 'betterave', 'courge', 'butternut', 'potiron',
    'potimarron', 'citrouille', 'panais', 'navet', 'topinambour', 'celeri', 'celeri rave', 'celeri branche', 'fenouil', 'artichaut', 'asperge', 'haricot vert',
    'haricots verts', 'petit pois', 'petits pois', 'pois gourmand', 'feve', 'edamame', 'mais doux', 'epi de mais', 'gingembre', 'curcuma frais', 'citronnelle',
    'pak choi', 'bok choy', 'blette', 'cornichon', 'germe', 'pousse',
    // herbes fraîches
    'herbe', 'basilic', 'persil', 'coriandre', 'menthe', 'ciboulette', 'aneth', 'estragon', 'cerfeuil', 'thym', 'romarin', 'sauge', 'laurier', 'origan frais',
  ] },
  { id: 'pain', label: 'Boulangerie', emoji: '🥖', words: [
    'pain', 'baguette', 'croissant', 'pain au chocolat', 'brioche', 'viennoiserie', 'pita', 'wrap', 'tortilla', 'galette de ble', 'pain de mie', 'bagel',
    'bun', 'buns', 'muffin anglais', 'focaccia', 'ciabatta', 'naan', 'chapelure', 'biscotte', 'pain burger', 'pain hamburger',
  ] },
  { id: 'frais', label: 'Frais', emoji: '🧀', words: [
    'lait', 'lait entier', 'lait demi ecreme', 'yaourt', 'yogourt', 'yaourt grec', 'skyr', 'fromage blanc', 'petit suisse', 'faisselle', 'creme', 'creme fraiche',
    'creme liquide', 'creme epaisse', 'creme entiere', 'mascarpone', 'beurre', 'margarine', 'oeuf', 'jaune d oeuf', 'blanc d oeuf',
    'fromage', 'emmental', 'gruyere', 'comte', 'parmesan', 'grana', 'pecorino', 'mozzarella', 'mozza', 'burrata', 'ricotta', 'feta', 'chevre', 'brie',
    'camembert', 'roquefort', 'bleu', 'gorgonzola', 'raclette', 'reblochon', 'cheddar', 'halloumi', 'cancoillotte', 'boursin', 'kiri', 'fromage rape',
    'jambon', 'jambon blanc', 'jambon cru', 'bacon', 'pancetta', 'coppa', 'bresaola', 'salami', 'saucisson', 'rillettes', 'pate de campagne', 'terrine',
    'houmous', 'tzatziki', 'guacamole', 'tofu', 'tempeh', 'seitan', 'pate feuilletee', 'pate brisee', 'pate sablee', 'pate a pizza', 'pate fraiche',
    'gnocchi', 'ravioli', 'tortellini', 'quenelle', 'surimi', 'compote', 'dessert', 'creme dessert', 'jus d orange frais', 'lardon', 'allumettes',
  ] },
  { id: 'viande', label: 'Viande et poisson', emoji: '🥩', words: [
    'viande', 'aile', 'poulet', 'blanc de poulet', 'escalope', 'cuisse', 'pilon', 'aiguillette', 'boeuf', 'steak', 'steak hache', 'hache', 'viande hachee', 'bavette',
    'entrecote', 'faux filet', 'rumsteck', 'roti', 'paleron', 'joue', 'veau', 'porc', 'filet mignon', 'cote', 'cotelette', 'echine', 'travers', 'agneau',
    'gigot', 'souris', 'canard', 'magret', 'confit', 'dinde', 'lapin', 'saucisse', 'merguez', 'chipolata', 'chorizo', 'boudin', 'andouillette', 'foie',
    'poisson', 'saumon', 'saumon fume', 'truite', 'thon frais', 'cabillaud', 'colin', 'lieu', 'merlu', 'bar', 'dorade', 'sole', 'maquereau', 'sardine fraiche',
    'crevette', 'gambas', 'moule', 'coquille saint jacques', 'saint jacques', 'calamar', 'encornet', 'poulpe', 'seiche', 'huitre', 'crabe', 'homard',
  ] },
  { id: 'epicerie', label: 'Épicerie', emoji: '🍝', words: [
    'pate', 'pates', 'spaghetti', 'tagliatelle', 'linguine', 'penne', 'fusilli', 'coquillette', 'macaroni', 'lasagne', 'rigatoni', 'orzo', 'nouille', 'vermicelle',
    'riz', 'riz basmati', 'riz arborio', 'risotto', 'quinoa', 'boulgour', 'semoule', 'couscous', 'polenta', 'lentille', 'pois chiche', 'haricot rouge',
    'haricot blanc', 'haricot', 'flageolet', 'farine', 'maizena', 'fecule', 'sucre', 'sucre glace', 'cassonade', 'vergeoise', 'sucre vanille', 'levure',
    'bicarbonate', 'sel', 'fleur de sel', 'poivre', 'epice', 'paprika', 'cumin', 'curry', 'curcuma', 'cannelle', 'muscade', 'gingembre moulu', 'piment d espelette',
    'herbes de provence', 'origan', 'ras el hanout', 'garam masala', 'vanille', 'gousse de vanille', 'huile', 'huile d olive', 'huile de tournesol',
    'huile de sesame', 'vinaigre', 'vinaigre balsamique', 'moutarde', 'mayonnaise', 'mayo', 'ketchup', 'sauce', 'sauce soja', 'sauce tomate', 'coulis',
    'tomates concassees', 'tomates pelees', 'concentre de tomate', 'passata', 'pulpe de tomate', 'pesto', 'tahini', 'tahin', 'beurre de cacahuete',
    'nuoc mam', 'sriracha', 'tabasco', 'bouillon', 'cube', 'fond de veau', 'lait de coco', 'creme de coco', 'conserve', 'thon', 'sardine', 'mais',
    'olive', 'capre', 'tomate sechee', 'cornichons', 'miel', 'sirop d erable', 'confiture', 'pate a tartiner', 'nutella', 'chocolat', 'chocolat noir',
    'pepite', 'cacao', 'cafe', 'the', 'tisane', 'infusion', 'cereale', 'muesli', 'granola', 'flocon', 'flocons d avoine', 'avoine', 'biscuit', 'gateau',
    'madeleine', 'chips', 'crackers', 'apero', 'cacahuete', 'pistache', 'noix', 'noisette', 'amande', 'poudre d amande', 'noix de cajou', 'pignon',
    'graine', 'sesame', 'chia', 'lin', 'raisin sec', 'abricot sec', 'datte', 'pruneau', 'fruits secs', 'compote en gourde', 'puree', 'galette de riz',
    'feuille de riz', 'nori', 'wasabi', 'gelatine', 'agar', 'colorant', 'arome', 'levure de boulanger', 'pate de curry', 'harissa', 'bouillon cube',
  ] },
  { id: 'boissons', label: 'Boissons', emoji: '🧃', words: [
    'eau', 'eau gazeuse', 'eau petillante', 'jus', 'jus de fruit', 'vin', 'vin blanc', 'vin rouge', 'rose', 'champagne', 'cremant', 'prosecco', 'biere',
    'cidre', 'soda', 'coca', 'limonade', 'ice tea', 'sirop', 'kombucha', 'lait d avoine', 'lait d amande', 'lait de soja', 'boisson vegetale', 'rhum',
    'vodka', 'gin', 'whisky', 'pastis', 'aperol', 'spritz', 'martini', 'porto', 'tonic', 'perrier',
  ] },
  { id: 'surgeles', label: 'Surgelés', emoji: '🧊', words: [
    'surgele', 'surgelee', 'glace', 'sorbet', 'glacon', 'pizza', 'frite', 'frites', 'nugget', 'poisson pane', 'legumes surgeles', 'epinards surgeles',
    'petits pois surgeles', 'cordon bleu',
  ] },
  { id: 'maison', label: 'Maison et hygiène', emoji: '🧴', words: [
    'papier', 'papier toilette', 'pq', 'sopalin', 'essuie tout', 'mouchoir', 'lessive', 'adoucissant', 'liquide vaisselle', 'pastille lave vaisselle',
    'tablette lave vaisselle', 'vaisselle', 'eponge', 'savon', 'gel douche', 'shampoing', 'shampooing', 'apres shampoing', 'dentifrice', 'brosse a dents',
    'fil dentaire', 'bain de bouche', 'coton', 'coton tige', 'deodorant', 'rasoir', 'mousse a raser', 'creme solaire', 'creme hydratante', 'serviette hygienique',
    'tampon', 'protege slip', 'demaquillant', 'sac poubelle', 'poubelle', 'javel', 'nettoyant', 'produit', 'desinfectant', 'vinaigre blanc', 'film alimentaire',
    'papier cuisson', 'papier alu', 'aluminium', 'sac congelation', 'ampoule', 'pile', 'bougie', 'allumette', 'litiere', 'croquette',
  ] },
]
export const OTHER = { id: 'autre', label: 'Autre', emoji: '🛍️' }

// mots qui ne disent rien du produit
const SKIP = new Set(['de', 'd', 'du', 'des', 'la', 'le', 'les', 'l', 'un', 'une', 'et', 'ou', 'au', 'aux', 'a', 'en', 'pour', 'avec', 'sans', 'bio', 'gros', 'grosse',
  'petit', 'petite', 'g', 'gr', 'kg', 'ml', 'cl', 'dl', 'l', 'c', 's', 'cs', 'cc', 'cas', 'cac', 'cuillere', 'cuilleres', 'soupe', 'pincee', 'pincees',
  'sachet', 'sachets', 'boite', 'boites', 'tranche', 'tranches', 'gousse', 'gousses', 'brin', 'brins', 'botte', 'bottes', 'filet', 'morceau', 'morceaux',
  'poignee', 'paquet', 'pot', 'bouteille', 'barquette', 'demi', 'quart', 'x'])

export const norm = (s: string) => s.toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

// un mot du dictionnaire trouve ses pluriels et accords : tomate → tomates, frais → fraiche
const fits = (word: string, key: string) => word === key || (word.startsWith(key) && word.length <= key.length + 3)

const INDEX = AISLES.flatMap((a) => a.words.map((w) => ({ id: a.id, keys: norm(w).split(' ').filter((k) => !SKIP.has(k)) })))

/** Rayon d'un article (« Potiron (500 g) », « 2 gousses d'ail », « Jus de citron »…). */
export function aisleOf(title: string) {
  const words = norm(title).split(' ').filter((w) => w && !/^\d/.test(w) && !SKIP.has(w))
  let best: { id: string; size: number; pos: number; len: number } | null = null
  for (const e of INDEX) {
    for (let i = 0; i + e.keys.length <= words.length; i++) {
      if (!e.keys.every((k, j) => fits(words[i + j], k))) continue
      // les expressions longues gagnent, puis le mot le plus à gauche (le produit vient en premier en français),
      // puis le mot le plus proche de ce qui est écrit (« laitue » plutôt que « lait »)
      const len = e.keys.join('').length
      if (!best || e.keys.length > best.size || (e.keys.length === best.size && (i < best.pos || (i === best.pos && len > best.len))))
        best = { id: e.id, size: e.keys.length, pos: i, len }
      break
    }
  }
  return best?.id ?? OTHER.id
}

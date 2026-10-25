'use strict';
(() => {
  const $ = (id) => document.getElementById(id);
  // Never transmit private messages or email addresses to any backend.
  const launcher = $('chatLauncher');
  const panel = $('chatPanel');
  const close = $('chatClose');
  const history = $('chatHistory');
  const form = $('chatForm');
  const input = $('chatInput');
  const topics = $('chatTopics');
  if (!launcher || !panel || !close || !history || !form || !input || !topics) return;

  const replies = Object.freeze([
    { pattern: /bonjour|salut|hello|bonsoir/i, answer:"Bonjour ! Je suis le guide automatique d'Atelier Montres. Vous pouvez me demander où en est le projet, parler des montres, de la livraison ou de l'inscription à la newsletter." },
    { pattern: /prix|tarif|combien|coût|euros?|payer|achat/i, answer:"La boutique n'est pas encore ouverte : aucun prix de vente n'est fixé et aucun paiement n'est accepté sur cette vitrine. Nous étudions actuellement des modèles, puis nous confirmerons les tarifs réels." },
    { pattern: /livrai|colis|expédi|expedition|envoi|délai|transport|mon colis|suivi/i, answer:"Nous prévoyons un petit stock contrôlé et des expéditions préparées en France. Les destinations, transporteurs, frais et délais précis seront publiés après validation : je ne peux pas promettre une date ou un coût aujourd'hui." },
    { pattern: /garanti|retour|rembour|rétract|sav|casse|panne/i, answer:"Les conditions de retour et le service après-vente seront publiés avant le lancement. Les droits légaux des consommateurs en France restent applicables, notamment la rétractation en principe pendant 14 jours pour l'achat à distance et la garantie légale de conformité." },
    { pattern: /marque|logo|personnalis|cadran|matériau|saphir|acier|mouvement|quartz/i, answer:"Nous recherchons des montres à quartz au rendu soigné, idéalement sans logo de tiers, avec la possibilité d'imprimer notre identité en usine. Les matériaux et caractéristiques seront affichés seulement une fois confirmés sur les modèles réellement sélectionnés." },
    { pattern: /newsletter|actualité|nouveauté|inscri|abonn|mail/i, answer:"Un espace newsletter est préparé sur cette page. Les inscriptions seront ouvertes via un formulaire externe avec confirmation de l'adresse e-mail, dès que le service sera configuré. Aucune adresse n'est récoltée par ce chatbot." },
    { pattern: /commande|panier|stock|disponible|acheter|boutique|ouvrir|ouverture/i, answer:"La collection est en préparation. Il n'y a actuellement ni catalogue actif ni commande possible. Les futurs achats seront sécurisés par une plateforme de paiement séparée, lorsque le commerce sera prêt." },
    { pattern: /taille|poignet|diamètre|bracelet|mesure/i, answer:"Pour choisir une montre, mesurez le tour de votre poignet avec un mètre ruban souple. La taille du boîtier, la longueur et la largeur du bracelet seront indiquées sur chaque fiche produit après leur vérification." },
    { pattern: /contact|écrire|humain|responsable|email|téléphone/i, answer:"Les coordonnées professionnelles ne sont pas encore publiées. Une page de contact complète sera ajoutée avant l'ouverture. Ne partagez pas de coordonnées personnelles dans ce chat : il n'est relié à aucun conseiller humain." }
  ]);
  const reply = (message) => {
    const trimmed = String(message || '').normalize('NFKC').slice(0,280);
    for (const answer of replies) if (answer.pattern.test(trimmed)) return answer.answer;
    return "Je suis un assistant d'information local, pas un conseiller en direct. Je peux répondre sur les prix, les montres, les stocks, la livraison, les garanties, le guide des tailles et la newsletter. Essayez une de ces catégories.";
  };
  const addMessage = (message, author) => {
    const line = document.createElement('p');
    line.className = 'chat-bubble' + (author === 'user' ? ' user' : '');
    line.textContent = message;
    history.appendChild(line);
    while (history.children.length > 32) history.firstElementChild.remove();
    history.scrollTop = history.scrollHeight;
  };
  const ask = (message) => {
    const clean = String(message).trim().slice(0,280);
    if (!clean) return;
    addMessage(clean, 'user');
    addMessage(reply(clean), 'bot');
  };
  const open = () => {
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    if (!history.children.length) addMessage("Bienvenue chez Atelier Montres. Comment puis-je vous renseigner ?", 'bot');
    input.focus();
  };
  const hide = () => {
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.focus();
  };
  launcher.addEventListener('click', () => panel.hidden ? open() : hide());
  close.addEventListener('click', hide);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !panel.hidden) hide(); });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    ask(input.value);
    input.value = '';
    input.focus();
  });
  topics.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-question]');
    if (btn) ask(btn.getAttribute('data-question') || '');
  });
  // Newsletter subscriptions are hosted by a verified external provider.
  // No email addresses are ever collected by this static website.
  fetch('./config.json', {cache:'no-store'})
    .then((response) => {
      if (!response.ok) throw new Error('Configuration inaccessible');
      return response.json();
    })
    .then((settings) => {
      const urlValue = settings?.newsletterUrl;
      if (typeof urlValue !== 'string') return;
      const url = new URL(urlValue);
      const host = url.hostname.toLowerCase();
      const allowed = host === 'sibforms.com' || host.endsWith('.sibforms.com') ||
        host === 'buttondown.com' || host.endsWith('.buttondown.com') ||
        host === 'brevo.com' || host.endsWith('.brevo.com');
      if (url.protocol !== 'https:' || !allowed) return;
      const link = $('newsletterCta');
      const inactive = $('newsletterComing');
      if (!link || !inactive) return;
      link.href = url.href;
      link.hidden = false;
      inactive.hidden = true;
    })
    .catch(() => { /* Prelaunch remains disabled; never claim a subscription. */ });
})();
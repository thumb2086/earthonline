const FILTERED_WORDS = ['fuck', 'shit', 'asshole', 'bitch', 'damn', 'cao', '幹', '靠北', '操你媽', 'fucking', 'stupid', 'idiot', 'nigger', 'bastard', 'piss off', 'suck my', 'motherfucker'];

const SHOP_ITEMS = {
  liquid_nitrogen:  { cost: 200,  effect: 'buff',     type: 'cooling',     duration: 1800000 },
  quantum_cooler:   { cost: 500,  effect: 'health',   value: 100 },
  overclock_chip:   { cost: 1500, effect: 'buff',     type: 'overclock',  duration: 3600000 },
  firewall:         { cost: 1000, effect: 'buff',     type: 'firewall',   duration: 1800000 },
  generator:        { cost: 800,  effect: 'revive',   value: 20 },
  neon_strip:       { cost: 3000, effect: 'cosmetic' },
  flash_drive:      { cost: 500,  effect: 'random' }
};

const ITEM_NAMES = {
  liquid_nitrogen: '液態氮冷卻瓶',
  quantum_cooler: '量子散熱塔',
  overclock_chip: '超頻晶片',
  firewall: '防火牆',
  generator: '備用發電機',
  neon_strip: '霓虹燈管',
  flash_drive: '隨身碟'
};

const COUNTRY_REGION = {
  TW: 'asia', CN: 'asia', JP: 'asia', KR: 'asia', HK: 'asia', SG: 'asia',
  IN: 'asia', MY: 'asia', TH: 'asia', VN: 'asia', PH: 'asia', ID: 'asia',
  US: 'us', CA: 'us', MX: 'us',
  GB: 'eu', DE: 'eu', FR: 'eu', IT: 'eu', ES: 'eu', NL: 'eu', SE: 'eu',
  NO: 'eu', DK: 'eu', FI: 'eu', PL: 'eu', PT: 'eu', BE: 'eu', AT: 'eu',
  CH: 'eu', IE: 'eu', CZ: 'eu', TR: 'eu', IL: 'eu', AE: 'asia', SA: 'asia',
  EG: 'eu', NG: 'eu', KE: 'eu', ZA: 'eu',
  AU: 'other', BR: 'other', RU: 'other', AR: 'other', CL: 'other', NZ: 'other'
};

const REGIONS = ['asia', 'us', 'eu'];

const GLOBAL_EVENT_TYPES = [
  'QUANTUM_BURST',
  'SOLAR_STORM',
  'DATA_GOLD_RUSH',
  'SATELLITE_ALIGNMENT',
  'SYSTEM_MAINTENANCE'
];

module.exports = {
  FILTERED_WORDS,
  SHOP_ITEMS,
  ITEM_NAMES,
  COUNTRY_REGION,
  REGIONS,
  GLOBAL_EVENT_TYPES
};

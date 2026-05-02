const SECRET_TEXTURES = {
  // СЮДА ВСТАВИТЬ ССЫЛКИ НА ВАШИ ТЕКСТУРЫ ИЗ МАЙНКРАФТА. Я добавил необходимые слоты.
  diamond: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/af534a577472d26a1ca2fcc4041933d9593c58ce/Diamond%20(2).png', // Алмаз
  bone: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/8c970cb8c0b7da10659ae8eaec9d945359cd8d88/bone.png', // Кость
  brush: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/8c970cb8c0b7da10659ae8eaec9d945359cd8d88/brush.png', // Кисточка
  emida_coin: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/5498f3e6a5a687981d79f7407bc173511bf93719/emerald.png', // Изумруд или Самородок
  ticket: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/5498f3e6a5a687981d79f7407bc173511bf93719/paper.png', // Билетик
  dirt: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/5498f3e6a5a687981d79f7407bc173511bf93719/dirt.png', // Земля
  rotten_flesh: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/5498f3e6a5a687981d79f7407bc173511bf93719/rotten_flesh.png', // Гнилая плоть
  iron: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/5498f3e6a5a687981d79f7407bc173511bf93719/iron_ingot.png', // Железный слиток
  gold: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/5498f3e6a5a687981d79f7407bc173511bf93719/gold_ingot.png', // Золотой слиток
  netherite: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/5498f3e6a5a687981d79f7407bc173511bf93719/netherite_ingot.png', // Незерит
  enchanted_apple: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/5498f3e6a5a687981d79f7407bc173511bf93719/golden_apple.png', // Нотч-яблоко
  creeper: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/5498f3e6a5a687981d79f7407bc173511bf93719/tnt_side.png', // Крипер
  wood_sword: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/267763bbedda592a3771dcbf3e6dcd64fd6b9bdd/Wooden_Sword.png',
  stone_sword: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/267763bbedda592a3771dcbf3e6dcd64fd6b9bdd/Stone_Sword.png',
  iron_sword: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/267763bbedda592a3771dcbf3e6dcd64fd6b9bdd/Iron_Sword.png',
  diamond_sword: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/267763bbedda592a3771dcbf3e6dcd64fd6b9bdd/Diamond_Sword.png',
  netherite_sword: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/267763bbedda592a3771dcbf3e6dcd64fd6b9bdd/Netherite_Sword.png',
  coal: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/267763bbedda592a3771dcbf3e6dcd64fd6b9bdd/Coal.png',
  iron_ore: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/267763bbedda592a3771dcbf3e6dcd64fd6b9bdd/Iron_Ore.png',
  gold_ore: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/267763bbedda592a3771dcbf3e6dcd64fd6b9bdd/Gold_Ore.png',
  diamond_ore: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/267763bbedda592a3771dcbf3e6dcd64fd6b9bdd/Diamond_Ore.png',
  emerald_ore: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/267763bbedda592a3771dcbf3e6dcd64fd6b9bdd/Emerald_Ore.png',
  cobblestone: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/267763bbedda592a3771dcbf3e6dcd64fd6b9bdd/Cobblestone.png',
  gold_block: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/267763bbedda592a3771dcbf3e6dcd64fd6b9bdd/Gold_Block.png',
  diamond_block: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/267763bbedda592a3771dcbf3e6dcd64fd6b9bdd/Diamond_Block.png',
  emerald_block: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/267763bbedda592a3771dcbf3e6dcd64fd6b9bdd/Emerald_Block.png',
  wood_pickaxe: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/267763bbedda592a3771dcbf3e6dcd64fd6b9bdd/Wooden_Pickaxe.png',
  stone_pickaxe: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/267763bbedda592a3771dcbf3e6dcd64fd6b9bdd/Stone_Pickaxe.png',
  iron_pickaxe: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/267763bbedda592a3771dcbf3e6dcd64fd6b9bdd/Iron_Pickaxe.png',
  diamond_pickaxe: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/267763bbedda592a3771dcbf3e6dcd64fd6b9bdd/Diamond_Pickaxe.png',
  redstone: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/267763bbedda592a3771dcbf3e6dcd64fd6b9bdd/Redstone.png',
  lapis: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/267763bbedda592a3771dcbf3e6dcd64fd6b9bdd/Lapis_Lazuli.png',
  firework: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/25aa79948d033afd15cab40b748a489a394af555/Firework_Rocket.png',
  chest: 'https://raw.githubusercontent.com/am0ba/SECRET_TEXTURES/af534a577472d26a1ca2fcc4041933d9593c58ce/Chest.png',
  chest_swords: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/master/assets/minecraft/textures/block/trapped_chest_front.png',
  chest_ores: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/master/assets/minecraft/textures/block/chest/trapped.png',
  ender_chest: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/master/assets/minecraft/textures/block/ender_chest.png'
};
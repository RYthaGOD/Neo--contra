export interface LevelData {
    id: number;
    name: string;
    description: string;
    bgm: string;
    backgroundColor: string;
    platformColor: number;
    worldWidth: number;
    bossType: string;
    difficultyMod: number;
}

export const LEVELS: LevelData[] = [
    {
        id: 1,
        name: "Neon Jungle",
        description: "Infiltrate the DeFi perimeter.",
        bgm: "neon_jungle",
        backgroundColor: "#000033",
        platformColor: 0x00ffff,
        worldWidth: 3200,
        bossType: "DeFi Destroyer Prime",
        difficultyMod: 1.0
    },
    {
        id: 2,
        name: "Blockchain Bridge",
        description: "Cross the distributed ledger.",
        bgm: "block_bridge",
        backgroundColor: "#220033",
        platformColor: 0xffff00,
        worldWidth: 4000,
        bossType: "Flash Loan Falcon",
        difficultyMod: 1.2
    },
    {
        id: 3,
        name: "Liquidity Lake",
        description: "Navigate the deep pools.",
        bgm: "liquid_lake",
        backgroundColor: "#002233",
        platformColor: 0x00ff00,
        worldWidth: 3800,
        bossType: "Rug Pull Reaper",
        difficultyMod: 1.5
    },
    {
        id: 4,
        name: "Mining Mountain",
        description: "Climb the hash rate peak.",
        bgm: "mining_mountain",
        backgroundColor: "#331100",
        platformColor: 0xff0000,
        worldWidth: 4500,
        bossType: "Hash Rate Hydra",
        difficultyMod: 1.8
    },
    {
        id: 5,
        name: "Genesis Citadel",
        description: "The source of the protocol.",
        bgm: "genesis_citadel",
        backgroundColor: "#000000",
        platformColor: 0xffffff,
        worldWidth: 6400,
        bossType: "Satoshi Sentinel",
        difficultyMod: 2.5
    }
];

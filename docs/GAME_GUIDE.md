# How to play SQUEEKFOREST: SEEDKEEPER

Each grove is a 5×5 board with two ponds, one old tree, three rocks and three sleeping spirits. Wake all three spirits with six plantings or fewer.

## Controls

- **Touch or mouse:** choose a seed in the satchel, then select a soil tile. Tiles marked `+` accept the selected seed. You can turn these markers off with "Show planting hints".
- **Keyboard:** Tab to the board, use the arrow keys to move (Home and End jump to the corners) and press Enter or Space to plant.
- **Undo** removes the last planting and returns its seed. **Restart** clears the board. **Hint** suggests the next step of a known route. All three are free.

## Seeds

You have two of each seed. "Beside" means any of the eight surrounding tiles, diagonals included.

| Seed | Where it can grow | What it does |
| --- | --- | --- |
| Willow | Soil beside a pond, and not beside a planted Sunpine | Waters all 8 neighboring tiles |
| Sunpine | Dry soil: not beside a pond or a Willow | Shades all 8 neighboring tiles |
| Glowcap | Soil that has both water and shade | Wakes spirits on its own tile and all 8 neighbors |

Ponds give natural water and the old tree gives natural shade. Rocks, ponds and the old tree can't be planted on. If a placement isn't allowed, the message under the board says why, and no move is used.

## Scoring

- 100 points for each awakened spirit.
- Restoring the whole grove adds 40 points for each unused planting and 20 for each seed type used.
- Your best score is kept per grove. Replays never add points together, so the forest-points total can't be farmed.

Every grove is checked by an exhaustive solver before it is offered. The solver stores the highest-scoring route it finds (4–6 plantings), and the hint follows that route.

## Groves

- **Verified groves** unlock when the game observes a new 60-block milestone of settled Squeek blocks. A milestone's grove is generated from the milestone number and the deployment identity alone, so everyone gets the same board for "Block milestone 1,200", whenever they arrived.
- **Practice groves** use fixed seeds, are labelled PRACTICE, and keep separate points. They work without the API.
- After a verified win, "Open next verified grove" appears when your journal holds an unplayed grove. "Try a practice grove" always says that it leaves verified play.
- The **Grove journal** lists every unlocked grove for replay.

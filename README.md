# FarmHand

A simple mobile app for tracking your plants (their journey from seed to harvest, and how often you water them), your animals (feeding chickens, counting their eggs and cleaning the coop, walking and grooming the dogs, grooming, riding and mucking out the horses) and recurring maintenance jobs (like adding bio enzymes to the septic tank). Built with [Expo](https://expo.dev) / React Native, so it runs on iOS, Android and the web.

## Features

- **One list of everything** – all plants and animals on the home screen, each showing its status at a glance:
  - Crops: their current stage and a countdown – *Seedling in 7 days*, *Transplant in 22 days*, *Harvest in 65 days* – turning orange when it's time to transplant or harvest.
  - Plants: when they were last watered and when they're next due (turns orange when due, red when overdue).
  - Animals: what's due – *Due: 🐾 Walk, 🧼 Groom* (orange when due, red when overdue) or *All looked after* – plus eggs collected today / over the last 7 days for laying birds.
- **Sections** – chips at the top of the list filter what you see, each with a count:
  - ⭐ **Overview** (the default) – only what needs attention now: plants due, overdue or never watered, seedlings ready to transplant, crops ready to harvest, animals due a feed, walk, groom, ride or clean-out, and maintenance tasks that are due. Shows *All caught up* when there's nothing to do.
  - 🌰 **Sown** – seeds that haven't sprouted yet.
  - 🌱 **Seedlings** – sprouted, waiting to be transplanted.
  - 🪴 **Plants** – growing, ready, harvested and watering-only plants.
  - 🐾 **Animals**.
  - 🛠️ **Maintenance** – recurring jobs.
- **Maintenance tasks** – recurring jobs like *Septic tank bio enzymes* (monthly), *Clean gutters* or *Service lawnmower*. Pick a suggestion or type your own, choose how often it repeats (weekly to yearly, or any number of days), and say when it was last done so it doesn't start out overdue. Each shows when it's next due (orange when due, red when overdue).
- **Animal care** – each animal tracks the jobs it needs: 🌾 **Feed**, 🐾 **Walk**, 🧼 **Groom**, 🏇 **Ride** and 🧹 **Clean** (the coop) / **Muck out** (the stable), plus 🥚 **Eggs** for laying birds. Each job has its own colour, on the card buttons and in the details popup. Cleaning out is done for the whole group at once, so it never asks which named animals it was for. Picking a type fills in the usual ones – chickens, ducks and quail: feed daily, clean the coop weekly and collect eggs; dogs: feed and walk daily, groom weekly; horses: feed, groom and muck out daily, ride every 2 days; snakes: feed by size, from every 5 days for a hatchling to every 3 weeks for a large adult – and you can turn jobs on or off and change how often each is due, when adding the animal or later in its details.
- **Snakes** – pick a size (*Hatchling* 5 days, *Juvenile* 7, *Sub-adult* 10, *Adult* 14, *Large adult* 21) to set how often it's fed. As it grows, pick the next size in its details (or set any number of days).
- **Seed inventory** – tap **＋ Add** → 🌰 **Seeds** to keep track of the seeds you have on hand (not yet sown): pick the crop, name the variety (e.g. *Cherry tomato*) and how many; **🌰 My seeds** shows the packets you have. When adding a plant, each crop tile shows how many seeds you have left, you pick which packet you're sowing from, it shows how many will be left, and saving takes the sown seeds out of the inventory. Tap a packet to 📷 take or choose photos of it (like plant photos – handy for the variety and sowing notes on the back), change how many are left, remove it, or send some to someone. The inventory isn't part of syncing between phones.
- **Named animals** – give a group of animals names (e.g. *Annie* and *Harley*), when adding them or later in their details. Tapping Feed, Walk, … then asks which of them it was for, with ticks for the ones that are due (or everyone) already set, and the history reads *Fed all* or *Walked Annie and Harley*. Each named animal is tracked on its own, so the dogs stay due until both have been walked – the card then says e.g. *🐾 Walk Harley*.
- **Quick actions** – tap 💧 **Water** on a plant, ✓ **Done** on a maintenance task, or a care job (🌾 **Feed**, 🐾 **Walk**, …) / 🥚 **+1** on an animal, right from the list. Animals show two buttons, with whatever's due first; every job has a button in the details popup.
- **Guided "Add" popup** – the **Add** button at the bottom opens a step-by-step popup:
  1. Choose **Plant** or **Animal**
  2. For plants, pick a crop (corn, tomato, strawberry, …) – each tile shows whether it's in season and how many seeds you have left – or *Other plant / houseplant* for watering only
  3. Enter details – for animals, pick a type (🐔 Chicken, 🦆 Duck, 🐦 Quail, 🐕 Dog, 🐴 Horse, 🐍 Snake, or type your own), how many or their names, and what they need and how often; for crops, a **growing guide** (sowing season with a *good time to sow?* check, depth, spacing, germination temperature and time, time to harvest, special notes like cold stratification), then choose **sow directly in the ground** or **start in a seed tray and transplant**, with the recommended method pre-selected (e.g. direct sowing for corn, a seed tray for tomatoes)
  4. Review the estimated timeline and save
- **Seed → Seedling → (Transplant) → Harvest** – each crop follows its journey:
  - After sowing, it counts down to the seedling stage, which starts automatically (or tap *It has sprouted* if it's early).
  - Direct-sown crops then count down to harvest.
  - Tray-started crops count down to *ready to transplant*, and the harvest countdown only starts once you tap **Mark as transplanted**.
  - Slow, uneven germinators like strawberries (7 days to 8 weeks) show *Should sprout any day* until the slowest expected date, instead of assuming they've sprouted.
  - Timings are typical averages per crop (see `src/crops.ts`); real gardens vary.
- **Adjust the timeline for your variety** – in a plant's details, tap any stage (Sown, Seedling, Transplant, Harvest) and pick a date on the calendar. Today or earlier records when it actually happened; a future date changes that plant's estimate. *Reset to the usual timing* undoes a change.
- **Photo log** – take or choose photos of each plant as it grows. Photos are labelled by age (*Day 23*), can be re-dated (handy for older photos from your library) or deleted, and the newest one becomes the plant's icon on the list. Animals have a photo log too (dated rather than labelled by age), and their newest photo becomes their icon.
- **Tags** – mark plants as **GMO-free**, **Bush** or **Runner** (a plant can't be both bush and runner), or type your own like *Heirloom*. Tags show on the plant's card, can be changed in its details, and are sent to Home Assistant as a `tags` attribute.
- **Seasons follow your hemisphere** – worked out from the phone's time zone, so October is spring in South Africa and autumn in Europe.
- **Details popup** – tap any item to see its timeline, stats and full history, confirm the next growth stage, log several eggs at once, undo a mis-tap, change how often a plant needs watering or a task repeats, rename it (✏️ **Rename**), or delete it.
- **Full screen on Android** – the system navigation bar is hidden while FarmHand is open; swipe up from the bottom edge to bring it back briefly.
- **Send plants, animals, tasks and seeds to another phone** – tap 📤 at the top → **Send** (or **Send seeds** on a seed packet). One list shows all your plants, animals, maintenance tasks and seed packets: tick what to send, choose how many plants, animals or seeds to give where an entry holds several (for named animals, tick which ones – their care history goes with them), and whether to include photos, then tap **Send**. FarmHand makes a small file and opens your phone's share menu, so you can send it by WhatsApp, email, Bluetooth, Nearby Share or AirDrop. The other person saves the file, taps 📤 → **Receive** → **Choose file**, and the plants, animals and tasks are added with their whole history, tags and photos, and the seeds go into their 🌰 inventory (topping up a packet with the same name). Afterwards the sender can **Update my phone** (or **Remove from my phone**) to finish the move – removing what was given away and taking the seeds out of the inventory – or keep a copy if you're both looking after them.
- **Sync two phones** – for a garden you look after together. Each phone keeps its own copy and they merge each other's changes: waterings, feedings, walks, groomings, rides, clean-outs, eggs and jobs done on either phone are all kept (so you'll both see the plants were watered), and for anything else – a rename, a new watering schedule, a growth stage – the most recent change wins. Deleting something or undoing an entry on one phone removes it on the other too. Two ways to sync:
  - **Automatically through Home Assistant** – connect both phones to the same Home Assistant (🏠) and turn on **Sync with other phones** on both. Changes come through within a minute while FarmHand is open. Photos stay on the phone that took them.
  - **With a sync file** – 📤 → **Sync** → **Send sync file**, and the other phone opens it with 📤 → **Receive**. Do it both ways for a full sync. Handy when one of you is away from home. Choose which photos to include: **None**, the **Last 7 days** (photos added to FarmHand in the past week – keeps the file small for regular syncs) or **All** (for the first sync). Photos left out aren't removed from the other phone.
- **Home Assistant sensors** – tap 🏠 at the top, enter your Home Assistant address and a long-lived access token, and every plant, animal and maintenance task appears in Home Assistant as a sensor (see below).
- Data is saved on the device (AsyncStorage), no account needed.

## Home Assistant

1. In Home Assistant, open your profile → **Security** → **Long-lived access tokens** → **Create token**, and copy it.
2. In FarmHand, tap 🏠, enter your Home Assistant address (e.g. `http://192.168.1.10:8123` – on Android use the IP address rather than `homeassistant.local`) and the token, then tap **Connect**.

FarmHand then creates these sensors:

| Entity | State | Useful attributes |
| --- | --- | --- |
| `sensor.farmhand_<crop name>` | growth stage: `seed`, `seedling`, `growing`, `ready`, `harvested` | `headline` (*Harvest in 12 days*), `needs_action`, `next_milestone`, `next_milestone_date`, `water_status`, `days_until_water_due`, `last_watered`, `tags` |
| `sensor.farmhand_<plant name>` (watering only) | `never`, `ok`, `due`, `overdue` | `days_until_water_due`, `last_watered`, `water_every_days`, `tags` |
| `sensor.farmhand_<animal name>` (laying birds) | eggs collected today | `eggs_last_7_days`, `eggs_total`, `needs_care`, `fed_today`, `last_fed`, `head_count`, `names`, and for each job `<job>_status`, `last_<fed/walked/groomed/ridden/cleaned>`, `<job>_every_days` |
| `sensor.farmhand_<animal name>` (other animals) | most pressing job: `never`, `ok`, `due`, `overdue` | `needs_care` (e.g. `walk, clean`), plus the same per-job attributes |
| `sensor.farmhand_<task name>` | `never`, `ok`, `due`, `overdue` | `due` (*Due in 23 days*), `days_until_due`, `every_days`, `last_done` |
| `sensor.farmhand_plants_to_water` | number of plants due, overdue or never watered | |
| `sensor.farmhand_eggs_today` | eggs collected today across all animals | |
| `sensor.farmhand_tasks_due` | number of maintenance tasks due, overdue or never done | |

With **Sync with other phones** on, each phone also keeps a copy of everything in a hidden `farmhand_sync.phone_<id>` entity and reads the other phones' copies from there.

Sensors are updated whenever you change something, when the app is opened, and every 15 minutes while it's open. Deleting an item removes its sensor, and **Disconnect** removes them all.

Good to know:

- FarmHand pushes the sensors from your phone, so they only update while the app is open. Home Assistant also forgets them when it restarts, until FarmHand next syncs.
- When using the web version, add the page's address to `cors_allowed_origins` under `http:` in Home Assistant's `configuration.yaml`.
- A standalone Android/iOS build talking to Home Assistant over plain `http://` needs cleartext traffic allowed (Expo Go already allows it); using an `https://` address (e.g. Nabu Casa) avoids this.

## Running it

```bash
npm install
npm start        # then scan the QR code with the Expo Go app on your phone
```

Or run `npm run android`, `npm run ios`, or `npm run web`.

## Project layout

```
App.tsx                         Home screen: list + bottom Add button
src/useItems.ts                 State + on-device persistence
src/useSeeds.ts                 Seed inventory + on-device persistence
src/homeAssistant.ts            Home Assistant sensors and REST API calls
src/useHomeAssistant.ts         Home Assistant connection and auto-sync
src/types.ts                    Plant / animal / maintenance task data model
src/crops.ts                    Crop catalog: sowing method, timings, growing guide
src/seasons.ts                  Hemisphere-aware seasons and sowing advice
src/growth.ts                   Seed → seedling → transplant → harvest stage logic
src/stats.ts, src/dates.ts      Watering/task-due and egg-count calculations
src/care.ts                     Animal care jobs (feed / walk / groom / ride / clean) and animal types
src/sections.ts                 Home screen sections (Overview / Sown / Seedlings / Plants / Animals / Maintenance)
src/components/AddItemModal.tsx Guided add popup (plant, animal or maintenance task)
src/components/ItemDetailModal.tsx  Item history / logging / delete
src/components/HomeAssistantModal.tsx  Connect to Home Assistant
src/components/TransferModal.tsx  Send plants, animals, tasks and seeds to / receive them from another phone
src/transfer.ts                 Item (plants, animals, tasks, seeds) and sync file formats (pack / unpack)
src/sync.ts                     Merging two phones' copies of the items
src/ids.ts, src/device.ts       Item GUIDs and this phone's id
src/transferFile(.web).ts       Share sheet and file picker for transfer files
src/components/ItemCard.tsx     A row in the list
src/components/SeedsModal.tsx   Seed inventory (opened from Add): add seeds, packets on hand, packet photos
src/components/CarePicker.tsx   Choose an animal's care jobs and how often
src/components/NamePicker.tsx   Animal names, and ticking which ones a feed/walk/… was for
src/components/Journey.tsx      Growth timeline
src/components/CropGuide.tsx    Growing guide card
src/components/Calendar.tsx     Date picker
src/components/MilestoneEditor.tsx  Change a stage's date
src/components/PhotoLog.tsx, PhotoViewer.tsx  Plant and animal photos
src/photoStorage(.web).ts       Saving photos on the device (or in the browser)
```

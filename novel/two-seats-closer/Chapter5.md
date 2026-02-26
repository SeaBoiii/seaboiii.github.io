---
layout: chapter
Title: Go-Live Glow-Up
novel: two-seats-closer
order: 5
---

Go-live week turned the office into a different species.

Meridian Harbor Systems didn't look like a battlefield--no sirens, no smoke, no people running with clipboards in slow motion.

But Faris had always believed true emergencies were quiet.

True emergencies wore business casual.

True emergencies arrived as emails with polite subject lines.

On Wednesday, SkyFreight's go-live day, the CIS floor woke up like a living engine.

Lights on early.

Coffee brewed nonstop.

Teams pings stacking like dominoes.

The air-conditioning biting harder than usual, as if the building wanted to keep everyone awake by force.

Jiawen arrived at 8:12am with two things:

1) a large iced kopi,

2) the expression of someone trying not to panic.

She placed her drink on her desk carefully, like it was sacred.

Faris was already at his desk.

Of course.

He looked up when she arrived.

Their eyes met.

Jiawen's heart did its annoying jump.

Then she remembered--go-live week had no space for romance.

She forced her face into professionalism.

"Morning," she said.

Faris nodded. "Morning."

Normal.

Yet his gaze held for a fraction longer.

A quiet check.

*You okay?*

Jiawen nodded slightly.

A silent reply.

*I'm here.*

Then Faris's voice shifted into work mode.

"War-room starts in fifteen," he said. "Priya already booked Meeting Room 3B. Client on at nine."

Jiawen nodded quickly.

Her fingers shook slightly as she opened her laptop.

Her screen filled with trackers.

Cutover checklist.

Training deck.

SOP document.

Risk log.

If she stared at enough checkboxes, maybe her heart would stop doing stupid things.

Across the pod, Reza popped up like an alarm.

"GO LIVE DAY!" he announced, arms thrown up. "Everyone, please be calm. Please don't die. Please don't cry."

Ben groaned from behind his monitor. "I will cry."

Priya marched in behind Reza with a folder in hand.

"Okay," Priya said, voice sharp. "No drama. No heroics. We follow checklist. We don't freestyle. Reza, if you say 'die' one more time, I will actually kill you."

Reza grinned. "Yes boss."

Jiawen swallowed.

Faris glanced at her.

His eyes softened briefly.

Then he looked away.

War-room.

***

Meeting Room 3B had the usual features of corporate suffering.

Cold air.

A long table.

A screen that never connected properly on the first try.

A whiteboard with markers that were always dying.

Priya stood at the front like a commander.

Ben sat with his laptop open, shoulders tense.

Reza arrived carrying a plastic bag full of snacks.

"Emergency supplies," he declared.

Priya glared. "What supplies."

Reza held up a packet of seaweed. "Seaweed."

Ben muttered, "We will die."

Faris sat beside Jiawen.

Of course.

Jiawen tried not to think about it.

She focused on the screen.

The client joined the call.

SkyFreight Ops Manager.

SkyFreight COO.

A few analysts.

Their faces were polite.

Too polite.

The kind of politeness that hid panic.

Faris began.

"Good morning," he said, voice calm, structured. "We'll proceed with cutover steps as planned. We'll provide updates every thirty minutes. If any blocker arises, we'll escalate immediately."

The COO nodded.

"Good," he said. "We need this to be smooth."

Priya smiled tightly.

Ben cracked his knuckles.

Jiawen's stomach churned.

The first two hours passed in clean steps.

Database backup.

Deploy config.

Validate connections.

Check dashboard refresh.

Every checkbox ticked felt like a small victory.

By 11:40am, Jiawen's shoulders loosened slightly.

Then the ops manager spoke.

"We have a discrepancy," he said.

The words landed like a stone.

Faris didn't flinch.

"What discrepancy?" he asked calmly.

The ops manager shared his screen.

Dashboard numbers.

Warehouse report.

Mismatch.

Again.

Jiawen's stomach dropped.

Ben leaned forward, eyes narrowing.

Priya's jaw tightened.

Reza whispered, "Not again…" like a prayer.

Faris's voice remained steady.

"Okay," he said. "We'll check time range, status loop, and report logic. Jiawen, can you verify the report filters they're using?"

Jiawen blinked.

Her throat tightened.

She nodded quickly.

"Yes," she said.

She leaned toward the screen, eyes scanning.

The ops manager clicked through filters.

Time range: last 24 hours.

Timezone: GMT+8.

Status: includes 'return-to-sender.'

Jiawen's mind moved fast.

This looked like the previous bug.

But Ben had patched.

So why?

Then she saw it.

A tiny dropdown.

The ops manager had selected a warehouse report that was not the main report.

It was a derived report.

A custom version.

With different logic.

Jiawen's chest tightened.

She leaned closer, voice calm.

"Can you scroll up," she asked politely.

The ops manager did.

There--report name.

"Warehouse Summary (Legacy)."

Jiawen's eyes widened.

Her heart thudded.

She glanced at Faris.

Faris's eyes met hers.

Steady.

Trusting.

Jiawen inhaled.

"That report uses a different completion definition," she said clearly. "It groups 'return-to-sender' as completed shipments, whereas our dashboard groups it as exception until final resolution. If you compare against the new report--'Warehouse Summary (Live)'--the numbers should align."

Silence.

The ops manager blinked.

Then he clicked.

Changed report.

Numbers aligned.

The COO exhaled.

"Okay," he said.

Jiawen's shoulders sagged in relief.

Priya's eyes widened.

Ben leaned back, half laughing, half exhausted.

Reza whispered, "Jiawen saved us again."

Faris's mouth twitched.

Pride.

The COO looked at the camera.

"Good catch," he said.

Jiawen's cheeks warmed.

Her face betrayed shock.

She managed a small nod. "Thank you."

Faris's voice remained calm.

"Okay," he said. "We'll document this report logic difference in the SOP to avoid future confusion."

The call moved on.

But Jiawen's heart was still pounding.

Because she had spoken.

In front of the COO.

And she had been right.

And Faris had let her take the space.

***

At 1:30pm, Priya called a break.

"Eat," she ordered. "Drink water. If you faint, I will not carry you."

Reza held up seaweed packet again. "Seaweed?"

Priya glared. "Go away."

They ate in the meeting room like soldiers.

Ben inhaled chicken rice.

Reza chewed loudly.

Priya ate while typing.

Jiawen stared at her sandwich, hands slightly shaky.

Faris sat beside her, quiet.

After a moment, he slid a bottle of water toward her.

Jiawen blinked.

Her face betrayed gratitude.

"Thanks," she whispered.

Faris nodded. "Okay."

Jiawen rolled her eyes weakly.

She took a sip.

Her throat unclenched.

Then she whispered, "My voice was shaking."

Faris glanced at her.

His eyes softened.

"It wasn't," he said calmly.

Jiawen stared at him.

She couldn't tell if he was lying.

Then Faris added, quieter, "Even if it was… you still did it."

Jiawen's throat tightened.

Warmth rose in her chest.

She looked away quickly.

Not here.

Not in meeting room.

Not in war-room.

She focused on chewing.

***

The afternoon dragged into evening.

Cutover steps continued.

The client pinged.

More checks.

More validations.

More small crises that were not truly crises.

By 7:10pm, the SkyFreight dashboard was stable.

Data refreshed correctly.

Ops team confirmed.

The COO's tone softened.

"Good job," he said on the final call. "This was smooth. Thank you."

Priya exhaled like she'd been holding her breath for twelve hours.

Ben leaned back, eyes closed.

Reza clapped softly. "We survived. We lived."

Priya glared. "Don't jinx."

The call ended.

Silence fell in the meeting room.

Then, suddenly, Priya stood.

"Okay," she said, voice brisk but with something warmer under it. "Everyone. Good job. Especially Jiawen."

Jiawen blinked.

Her cheeks warmed.

Faris's posture tightened slightly.

Priya turned toward Jiawen.

"You saved us twice," Priya said. "Not because Faris spoon-fed you. Because you paid attention. You asked the right questions. You had the courage to speak."

Jiawen's throat tightened.

Reza nodded enthusiastically. "Yes! Jiawen MVP!"

Ben murmured, "True."

Jiawen's eyes shimmered.

Her face betrayed it.

She blinked fast.

"Thank you," she said, voice small.

Priya nodded. "Okay. Go home. Shower. Sleep. Tomorrow still have training sessions."

Reza stood dramatically. "I will go home and cry."

Priya rolled her eyes. "Go."

They packed up.

As they walked out of the meeting room, Reza slapped Jiawen lightly on the shoulder.

"Wah, you're dangerous," he said, grinning. "Next time you become boss already."

Jiawen made a face. "Don't curse me."

Reza laughed. "Okay, okay."

Ben waved tiredly and headed toward the lifts.

Priya walked ahead, already on her phone again.

Reza disappeared to buy bubble tea.

And suddenly, it was just Jiawen and Faris.

The hallway was quiet.

The glass walls reflected them.

Jiawen's chest tightened.

Because now the adrenaline was fading.

Now there was space for feelings.

Faris cleared his throat.

"Good job," he said quietly.

Jiawen blinked.

She wanted to say something witty.

Something light.

Instead, her voice came out soft.

"Thank you," she whispered.

Faris looked at her.

His eyes were steady.

Warm.

Then he glanced away quickly, as if warmth was illegal in office corridors.

"I'll send you home," he said, voice neutral.

Jiawen's heart thudded.

She wanted to say yes.

She also remembered HR.

Seating changes.

Optics.

Perception.

She hesitated.

Faris noticed.

His jaw tightened slightly.

"You don't have to say yes because I offered," he said quietly. "But it's late."

Jiawen swallowed.

Her face betrayed conflict.

Then she nodded.

"Okay," she said.

Faris's mouth twitched.

"Okay," he replied.

They took the lift down.

The lobby was quieter at this hour.

The security guard yawned.

Outside, the air was humid and soft.

Faris walked toward his car.

Jiawen followed.

At the passenger door, Jiawen paused.

Faris reached for the handle.

Then he stopped.

He looked at her.

A question.

Their deal.

Jiawen's mouth twitched.

She stepped forward and opened the door herself.

Faris blinked.

Then his mouth softened.

A small smile.

Jiawen grinned briefly.

Then she slid into the seat.

***

On the drive, the city lights blurred.

Jiawen stared out the window, exhaustion settling into her bones.

Faris drove quietly, hands steady on the wheel.

After a while, Jiawen whispered, "I thought I would mess up today."

Faris glanced at her. "You didn't."

Jiawen's throat tightened.

Her voice came out small.

"I'm scared HR will move me away," she admitted.

Faris's jaw tightened.

He kept his eyes on the road.

"They might," he said honestly. "But it doesn't erase what you did today."

Jiawen swallowed.

Faris continued, voice low, "And if anyone says you're only good because of me… I'll correct them."

Jiawen blinked.

Her face betrayed surprise.

"Won't that make rumours worse?" she whispered.

Faris exhaled.

"I'll correct professionally," he said. "Not with drama. With facts."

Jiawen stared at him.

She didn't know why his seriousness made her feel safe.

Maybe because his seriousness wasn't cold.

It was steady.

She whispered, "Okay."

Faris murmured, "Okay."

When they reached Jiawen's block, the void deck was quiet.

The chess table empty.

Only the hum of distant traffic.

Faris parked.

Turned off the engine.

Silence filled the car.

Jiawen unbuckled her seatbelt slowly.

She hesitated.

Then she looked at Faris.

"Thank you," she whispered. "For today."

Faris stared at her.

His eyes softened.

He didn't say okay immediately.

Instead, he reached into his inner pocket.

Jiawen's heart thudded.

The handkerchief.

He pulled it out.

Folded neatly.

He held it out.

Not because she was crying.

Because it had become their symbol.

A small thing that said: *I see you.*

Jiawen blinked.

Her eyes shimmered.

Her face betrayed it.

She took it slowly.

Her fingers brushed his.

Warm.

She laughed softly.

"You think I will cry again?" she whispered.

Faris's mouth twitched. "Maybe."

Jiawen rolled her eyes, smiling through tiredness.

Then she said, softly, "I want to keep it."

Faris's throat tightened.

He nodded once.

"Okay," he said.

Jiawen's lips twitched.

"Good," she replied.

Faris chuckled quietly.

Jiawen opened the door.

Stepped out.

Then she paused.

She turned back, half inside the car, half outside.

"Faris," she whispered.

He looked at her.

Jiawen's cheeks warmed.

Her face betrayed shyness.

Then she said, very quickly, "I'm proud of myself today."

Faris's mouth softened.

He nodded once.

"You should be," he said quietly.

Jiawen's chest tightened.

She smiled.

Then she hurried toward the lift like she was afraid she'd stay too long.

Faris watched her disappear.

He sat in the car for a moment.

Exhaled slowly.

Go-live was done.

SkyFreight was stable.

The team had survived.

Jiawen had shone.

And yet, in the quiet after victory, Faris felt the next wave already forming.

HR safeguards.

Seat reshuffles.

Perception.

Junhao.

And somewhere in the background, louder than he wanted to admit--

The realisation that Jiawen's glow-up wasn't just about work.

It was about learning to stand under pressure and still be herself.

And Faris, for all his careful planning, knew one thing clearly:

The more she grew, the less he could protect her.

Which meant he had to do something harder.

He had to trust her.

Properly.

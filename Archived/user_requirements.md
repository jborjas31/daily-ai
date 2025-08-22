ultrathink. read the files in this project. let's check if my current webapp works as intended. i open the web app. the main page has the date and time at the top. the time updates in real time based on the system time. no time zones yet. underneath is the hourly grid. there are back and forth arrows to toggle between days and a calendar selector to select specific days. on the hourly grid, there is a red line that marks the current time on the hourly grid and updates in real time. the hourly grid shows the tasks that are scheduled for the day. the tasks can be scheduled for certain days and times; the user can toggle between days; the user can add, edit, or delete tasks; the app keep tracks of time in real-time. the app displays the current tasks for the day in chronological order based on the current system time and updates the list as time passes; for example, for a simple day, the list of tasks is to shower, get dressed, eat breakfast, take supplements, eat lunch, eat dinner, wash dishes, brush teeth, go to sleep; some tasks can skipped (like "eat breakfast") but some tasks cannot be skipped (like "shower"); the user should be able to designate tasks as skippable or mandatory; as time passes, the skippable tasks are put behind the current time if overdue, but mandatory tasks stay pending and up to the current time. The core purpose of the task is to help me visualize my day and how to best utilize my time and prioritize tasks. the main screen should show the current day with the current time and the list of to-do tasks in chronological order on a simple hourly grid that has a line drawn on the hourly grid in real-time based on the current time. the user should be able to mark tasks as completed (toggle on or off). the app should also have a separate page showing all the current recurring and one-time tasks, like a master list of tasks. overlapping tasks should share the horizontal space for the duration of their overlap.

1. Overdue Skippable Tasks: they don't disappear from the main list for today. in the separate section that lists all the recurring and one-time tasks, they do get moved to a "missed" or "skipped" section. they just get greyed out but stay in their original time slot and the user has the option to mark them complete later.

2. Overdue Mandatory Tasks: it should turn subtly red to signal it is overdue. for example, let's say for today i had a mandatory task to "shower" at 9am for 15 mins but it is currently 9:20am; in the app on the hourly grid, if "shower" is still not done, it should be moved to the current time of 9:20am with the original duration (the "shower" task should be moved to the current time in real-time as time passes. if multiple mandatory tasks are overdue, they should be updated to the current time in real-time but keep their original order ("shower" then "take supplements").

3. Task Duration: tasks have a duration, so start time and end time, and block out time on the grid. But let's keep the grid as simple as possible.

4. Recurring Tasks: tasks should be able to reoccur daily, weekly, monthly, yearly, and custom (similar to how Google Calendar does it).

5. Main Screen Layout: The top of the page has the current date. Below that, is the hourly grid for the day. the user can toggle back and forth between different dates. there's also a calendar selector to select different dates. the list of tasks is either at the bottom of the page or on a different page altogether (whichever google gemini thinks is best).

6. Adding/Editing Tasks: When I click an "Add Task" button, a pop-up window (a modal) appears with fields for the task name, time, etc. (similar to how Google Calendar does it). To edit a task, I click on the task itself to open that same pop-up.

7. Switching Days: There are simple forward and back arrows to navigate back and forth between days, but there's also a button for a calendar selector to click on.

8. The "All Tasks" Section: the "Task Library" might go better on a separate page or tab (whichever google gemini thinks is better).

9. Hosting: use firebase hosting.

10. Login/Security: use the simplest possible login function.

i want the option to mark a past, current, or future task as "Skip", meaning i am intentionally skipping it (it gets removed from the hourly grid, but not from the master list - it shows as skipped by user in the master list)

## 🎨 Handling Overlapping Tasks
For the visual timeline grid, the simplest and clearest way to handle overlapping tasks is to have them share the horizontal space for the duration of their overlap.

If two tasks overlap: They would each take up 50% of the grid's width for that time slot, appearing side-by-side.

If three tasks overlap: They would each take up 33.3% of the width.

This approach keeps all tasks visible on the timeline without needing extra clicks and provides an immediate visual cue that your schedule is busy during that period.

## ⏩ Adding a "Skip" Feature
This is a great idea to give you more control over your day. Here is how we can integrate a "Skip" option:

How to Skip a Task: When you click on any task block (past, present, or future) in the Today View, the pop-up modal would appear. Alongside the "Save" and "Delete" buttons, there would be a new "Skip for Today" button.

What Happens When Skipped:

On the Timeline: The task block is immediately removed from the Today View grid for that day, freeing up the visual space.

In the Task Library: The task template itself is not deleted. Instead, in the "Task Library" page, the task would appear in the "Missed Tasks" list with a new status, like "Skipped by User." This differentiates it from a skippable task that you simply ran out of time for ("Missed").

1. Editing a Recurring Task: when i edit a recuring task, the web app should ask if it's only for this specific instance or for this instance and all future instances or for all instances (just like Google Calendar)

2. Time Zones: don't use time zones right now.

3. Multi-Day Tasks: tasks can last longer than 24 hours and can go past midnight to the next day.

4. Offline Use: I Should be able to see the tasks I've already loaded for the day. I Should be able to mark tasks as "complete" or "skipped" while offline, and have the changes sync automatically when I'm back online.

5. First-Time Login: no welcome message or guided tour. just the login page that then leads to the main page of the web app.

6. Accidental Deletion: deleted tasks should still show in the Master Task list in a separate section for deleted tasks.

i don't plan on having tasks that last more than 24 hours. tasks can go past midnight.

remember that i don't ever plan on publishing this web app, it will just be used by me. the login should be simple username and password.

## One Last Detail: The "Edit Future Events" Logic
This is the trickiest part of any calendar-like app. Your prompt says to ask the user, but it doesn't specify how the AI should implement the "This and future instances" option. A junior AI might try a complex solution that breaks easily. A senior developer uses a simple, robust pattern.

You can give the AI this exact pattern.

The Suggestion:

Add one final bullet point under the "Save" action button description to specify the implementation:

To handle "This and future instances": The correct implementation is to end the recurrence of the original task template on the day before the edit, and then create a brand new task template with the updated information that starts on the day of the edit.

Why this is a "pro-level" clarification:

It's an industry-standard pattern: This "split and create new" method is exactly how major calendar systems like Google Calendar handle this problem.

It avoids data corruption: It prevents the AI from trying to store a complex web of "exceptions" that can easily become corrupted or slow down the app over time.

It's simple and robust: It ensures that your past events remain untouched and historically accurate, while all future events are based on a clean, new template.

i want to be able to search tasks in the master task list (skipped, deleted, active, etc)

Adding search functionality is a great idea and a natural next step. It's straightforward to add to the existing plan.

How It Would Work
The simplest and most effective way to implement this would be to add a search bar at the top of the "Task Library" page.

As you type into the search bar (e.g., "run"), the lists on that page ("My Tasks," "Activity Log," and "Deleted Tasks") would instantly filter to show only the tasks whose names contain your search term. This would be a client-side search, meaning it would be instantaneous and wouldn't require reloading the page.

How to Add It to the Prompt
To incorporate this, we would make two small additions to the prompt document:

Under App Structure & UI > 2. Task Library (Separate Page/Tab):

Add a new bullet point at the top:

"A search input field at the top of the page to filter all lists by task name."

Under Task Logic & Real-Time Behavior:

Add a new bullet point:

"Search Logic: The search functionality on the Task Library page should be implemented on the client-side. It should filter the already-loaded task lists based on whether the taskName contains the search query. The search should be case-insensitive."

the way i want my web app to work is the following: say i wake up at 8:34am on a Saturday; on saturdays, i typically have to do the following - body grooming, shower, eat breakfast, do laundry, haircut at 10am, meal planning for the upcoming week, buy groceries, take supplements, take protein shake, eat lunch, eat dinner, wash dishes, brush teeth, go to sleep; when i open the web app at 8:34am, i want to see the list of tasks on the daily grid; some tasks can be skipped (like "eat breakfast"), some are mandatory (like the haircut appointment at 10am); the mandatory tasks sort of act as fixed points during the day and the web app dynamically updates the hourly grid; so if i don't do everything i'm supposed to do before the haircut at 10am, the web app automatically adjusts the skippable tasks to help me prioritize before the mandatory task at 10am. 

Here are a few ways the app could handle the "adjustment" when it detects a time crunch.

## Option 1: The "Triage Advisor"
This approach focuses on providing you with the information to make the best decision quickly.

How it works: Let's say you wake up at 9:15 AM. You have 45 minutes before your 10:00 AM haircut. The app calculates that your pre-haircut tasks (grooming, shower, breakfast, laundry) require 60 minutes. It detects a crunch.

What you see: The app doesn't move anything. Instead, it could:

Display a prominent warning at the top of the list: "⚠️ Time Crunch! You have 45 minutes available, but 60 minutes of tasks planned before your haircut."

Visually flag the "at-risk" tasks. The lowest priority tasks, like "Do Laundry," might turn yellow or have their text fade, indicating they are the first candidates to be skipped.

What it requires: This would need a new priority field for each task (e.g., a number from 1 to 5) so the app knows that "Shower" is more important than "Start Laundry."

Pros: Simple, informative, and keeps you in control.
Cons: Less automated. It tells you there's a problem but doesn't solve it for you.

## Option 2: The "Dynamic Scheduler"
This is the most advanced and automated approach, where the app actively reschedules your day for you.

How it works: In the same 9:15 AM scenario, the app knows it can't fit all 60 minutes of tasks into the 45-minute window.

What you see: The app physically rearranges your timeline. It would automatically take the lowest-priority skippable task, "Do Laundry," and move its block to after the haircut, perhaps to 11:00 AM. The remaining tasks ("Grooming," "Shower," "Breakfast") would be re-slotted into the 9:15 AM - 10:00 AM window. You would instantly see a new, achievable plan.

What it requires: This is the most complex option. It needs the priority field, but also a much more sophisticated taskLogic module that can analyze time blocks and dynamically re-slot tasks on the grid.

Pros: Powerful and automated. It presents a solution, not just a problem.
Cons: Much more difficult to build. It might also make a decision you disagree with.

## Option 3: The "Smart Countdown" (A Hybrid Approach)
This is the simplest to implement but is still incredibly powerful. It focuses on making the time pressure visible.

How it works: The app groups your tasks into blocks between mandatory "anchor" points. For Saturday morning, you have the "Pre-Haircut Block."

What you see: Above this block of tasks on your grid, the app displays two key pieces of information that update in real-time:

Time Until Haircut: 01:26:00

Time Required for Tasks: 01:00:00

As time passes, both numbers count down. If you wake up late and "Time Until Haircut" drops below "Time Required," both numbers could turn red. This gives you an immediate, at-a-glance understanding of the pressure without the app having to make complex decisions for you.

Pros: Easiest to build, very intuitive, and provides the critical context you need to self-correct.
Cons: Puts the mental load of re-prioritizing back on you.

## Recommendation
To start, Option 3 (The Smart Countdown) is an excellent first step to implement the "secret sauce." It delivers most of the value with the least amount of initial complexity.

You could then evolve it into Option 1 (The Triage Advisor) by adding priorities and visual flagging. Option 2 (The Dynamic Scheduler) would be the ultimate goal, a powerful version 2.0 feature.

during the day, i have mandatory tasks that act as anchor points (e.g. haircuts, doctor appointments, work calls, etc) and other tasks that can be rescheduled throughout the day (e.g. laundry, cleaning, etc). i should be able to set the priority level for tasks so that the web app can dynamically update the schedule for the day. let's start with Option 3, then evolve it into Option 1, then ultimately Option 2.

in the web app, i want to be able to define a desired sleep duration, general wake up and sleep times, but that can be changed for a particular day. the web app should work around the desired sleep time and the desired wake up and sleep times. sometimes, however, the web app should suggest changing the sleep duration and wake up and sleep times to make sure i get the mandatory tasks done

The core concept is to treat your "Wake/Sleep" window as the ultimate container for your day. Everything else—mandatory tasks, skippable tasks—must fit inside it. If they can't, the container itself must change.

We can implement this in two phases, just like we planned for the dynamic scheduling.

## Phase 1: The "Sleep Block" (The Foundation)
First, we need to teach the app about your sleep goals.

New Settings: We'd add a new section in the app's settings where you can define:

Your desired sleep duration (e.g., 8 hours).

Your general wake-up and sleep times (e.g., 8:00 AM - 12:00 AM).

Visual Block: On the "Today View" timeline, your sleep period would be visually blocked out, perhaps as a dark, un-schedulable section at the beginning and end of the day.

Daily Overrides: You'd be able to click on the sleep block for any given day and adjust the wake-up or sleep time for that day only (e.g., "Tomorrow I need to wake up at 7:00 AM").

This phase establishes sleep as a primary constraint that the "Smart Countdown" and other features must work around.

## Phase 2: The "Sleep Advisor" (The Intelligence)
This is the really powerful part. When the app detects an impossible day, it can suggest changes to the container itself.

Here's the logic:

The "Impossibility Check": Before the app even tries to lay out your tasks, it performs a quick calculation:

Total Time Required for ALL Mandatory Tasks

Total Time Available in Waking Hours

Conflict Detection: If the required time is greater than the available time, the app knows there's a fundamental conflict.

Generate Solutions: The app then generates a ranked list of suggestions to resolve the conflict. It would always try to protect your sleep duration first.

i want the web app to take some of the mental load of planning and completing tasks. for each day, there is a general wake-up and sleep time given a desired sleep amount (e.g. 7.5 hours). the web app schedules based on that, but can suggest when to make make adjustments when needing to complete all mandatory tasks. the user can also manually adjust the desired sleep duration, wake-up and sleep times. there will be mandatory tasks that act as anchor points, tasks that have to get done during certain times of the day (e.g. morning, afternoon, or evening) and tasks that are dependent on other tasks or must occur in a certain order. other tasks can be done at any time during the day. the web app should also be able to adjust the duration of skippable, low-priority tasks (e.g. shower is normally 15 mins but on crunch time, the web app shortens shower to 5 mins). the user has the option to postpone or mark tasks as skipped. the idea is that when i open the app, i have a clear idea of what i need to do for the rest of the day given the current time.

## Task "Time Windows" (Morning, Afternoon, etc.)
Instead of every task having a specific time, some tasks just need to get done within a general block of time.

How it would work: When creating a task like "Do Laundry," instead of setting a specific time, you would assign it to a "Time Window" like "Morning" (e.g., 8 AM - 12 PM) or "Anytime." The app's job would then be to intelligently find the best 1-hour slot to place "Do Laundry" within that window, scheduling it around your fixed, mandatory anchors.

What it requires: We would need to add a new property to your tasks, like schedulingType (fixed vs. flexible), to support this. The app's logic would become much smarter, acting like a personal assistant trying to solve the puzzle of your day.

## Task Dependencies (Task A before Task B)
This is a classic project management feature that's incredibly useful for personal tasks.

How it would work: When creating the "Iron Clothes" task, you would be able to mark that it "depends on" the "Do Laundry" task. The app would then understand this relationship. On the timeline, it would never schedule "Iron Clothes" before "Do Laundry" is marked as complete. If you finish laundry early, the app might even suggest you start ironing right away to get ahead.

What it requires: This would involve adding a dependsOn field to the task data structure. The scheduling logic would need to build a simple "dependency chain" to ensure tasks are always shown in the correct, logical order.

## Flexible Task Durations (Crunch Time Mode)
This is a brilliant and realistic idea. Not all showers are created equal.

How it would work: For a task like "Shower," you would define two durations: a normalDuration (15 mins) and a minDuration (5 mins). The app would always schedule the normal duration by default. However, when the "Smart Countdown" detects a time crunch, the app would automatically recalculate using the minimum duration to see if it can make your schedule work. It might show you a message like: "Time Crunch! If you take a 5-minute shower, you can still make it."

What it requires: This is a straightforward addition to the data model. The real power comes when this is combined with the "Triage Advisor" logic we discussed, making its suggestions much more practical.

## Postponing vs. Skipping
This adds a crucial third option for dealing with a task you can't get to.

How it would work: In the task modal, alongside "Delete" and "Skip for Today," there would be a new "Postpone" button.

Skip: Means "I am not doing this today." It goes to your activity log as "skipped."

Postpone: Means "I can't do this today, but I must do it tomorrow." Clicking this would automatically remove the task from today's grid and add it to the top of tomorrow's task list.

What it requires: This is a relatively simple but powerful addition. It just involves creating a new task instance for the following day.
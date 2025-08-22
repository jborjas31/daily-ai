# Basics

## User Document Structure (Simplified Settings)
```json
{
  "userId": "user123",
  "desiredSleepDuration": 7.5,
  "defaultWakeTime": "06:30",
  "defaultSleepTime": "23:00"
}
```

## Current User Settings
- Desired sleep duration: 7.5 hours
- Wake-up time: 6:30 am
- Sleep time: 11pm

## Recurring Tasks

### Sample Task Template Structure
```json
{
  "taskId": "drink_water_am",
  "taskName": "Drink water AM",
  "description": "Start the day with hydration - drink a full glass of water",
  "durationMinutes": 3,
  "minDurationMinutes": 1,
  "isMandatory": false,
  "priority": 3,
  "isActive": true,
  "schedulingType": "flexible",
  "timeWindow": "morning",
  "recurrenceRule": {
    "frequency": "daily",
    "interval": 1
  }
}
```

### New Task with Default Values Applied
```json
{
  "taskId": "new_task_001",
  "taskName": "Review project proposal",
  "description": "",
  "durationMinutes": 30,
  "minDurationMinutes": 20,
  "isMandatory": false,
  "priority": 3,
  "isActive": true,
  "schedulingType": "flexible",
  "timeWindow": "afternoon",
  "recurrenceRule": {
    "frequency": "none"
  }
}
```
*Example shows default values when user creates task at 2:00 PM without specifying duration or priority*

### Daily Recurring Tasks
- Drink water AM
 - 3 mins
 - Time block: morning
 - Skippable
 - Flexible
- Shower
  - 10 mins
  - Time block: morning
  - Mandatory
  - Flexible
- Brush teeth AM
  - 3 mins
  - Time block: morning
  - Skippable
  - Flexible
- Eat breakfast
  - 30 mins
  - Time block: morning
  - Skippable
  - Flexible
- Take supplements
  - 5 mins
  - Time block: Anytime
  - Skippable
  - Flexible
- Eat lunch
  - 45 mins
  - Time block: Afternoon
  - Skippable
  - Flexible
- Eat dinner
  - 45 mins
  - Time block: Evening
  - Skippable
  - Flexible
- Cook
  - 30 mins
  - Time block: Evening
  - Skippable
  - Flexible
- Wash dishes
  - 15 mins
  - Time block: Evening
  - Skippable
  - Flexible
- Cleaning
- Brush teeth PM
  - 3 mins
  - Time block: evening
  - Skippable
  - Flexible
- Floss PM
  - 3 mins
  - Time block: evening
  - Skippable
  - Flexible

### Sample Weekly Task Template
```json
{
  "taskId": "do_laundry",
  "taskName": "Do laundry",
  "description": "Wash and dry clothes - check pockets first, separate colors",
  "durationMinutes": 60,
  "minDurationMinutes": 45,
  "isMandatory": false,
  "priority": 4,
  "isActive": true,
  "schedulingType": "flexible",
  "timeWindow": "morning",
  "recurrenceRule": {
    "frequency": "weekly",
    "interval": 1,
    "daysOfWeek": ["saturday"]
  }
}
```

### Sample Task with Dependency
```json
{
  "taskId": "iron_clothes",
  "taskName": "Iron clothes",
  "description": "Iron freshly washed clothes while still slightly damp",
  "durationMinutes": 30,
  "minDurationMinutes": 20,
  "isMandatory": false,
  "priority": 3,
  "isActive": true,
  "schedulingType": "flexible",
  "timeWindow": "afternoon",
  "dependsOn": "do_laundry",
  "recurrenceRule": {
    "frequency": "weekly",
    "interval": 1,
    "daysOfWeek": ["saturday"]
  }
}
```

### Weekly Recurring Tasks
- Do laundry
  - Recurring: weekly Saturday
- Iron clothes
  - Done after "Do Laundry" task
  - Recurring: weekly Saturday
- Meal planning
  - Done before "Buy groceries" task
  - Recurring: weekly Saturday
- Buy groceries
  - Recurring: weekly Saturday
- Bodily grooming
  - Recurring: weekly Saturday
- Fill up car gas tank
  - Recurring: weekly Saturday
- Take out trash
  - Recurring: weekly Sunday

### Monthly Recurring Tasks
- Send roommate Dan the utility bill
  - Recurring: 12th of each month
  - 15 mins
- Haircut

## One-time tasks

### Sample Fixed Anchor Task
```json
{
  "taskId": "flight_madrid_atlanta",
  "taskName": "Flight from Madrid to Atlanta",
  "description": "AA1234 departure MAD Terminal 4S, arrive ATL Terminal F - check in 3 hours early",
  "durationMinutes": 480,
  "minDurationMinutes": 480,
  "isMandatory": true,
  "priority": 5,
  "isActive": true,
  "schedulingType": "fixed",
  "defaultTime": "10:00",
  "recurrenceRule": {
    "frequency": "none"
  }
}
```

### Anchor tasks
- Flight from Madrid to Atlanta on August 21

## Task Instances (Only Created When Modified)
```json
{
  "instanceId": "shower_2024_08_17",
  "templateId": "shower",
  "date": "2024-08-17",
  "status": "completed",
  "completedAt": "2024-08-17T07:15:00Z"
}
```

**Note:** Task instances are only created when tasks deviate from their template (completed, skipped, postponed). Default recurring tasks don't create instances unless modified. Rolling 30-day retention window prevents data growth.

# Simulations
## Wednesday Aug 13

## Thursday Aug 14

## Friday Aug 15
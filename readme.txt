# Upgrading Instructions:
- Refactor the code, so each components should on handle 1 specific Type of Task
- There should be 1 text that quickly describe the relationships between notes, this should be a new property of choise (if they don't have then it's fine, just be the same are normal). The Problem is, maybe this would involve a change in data structure. links_to would now become an Object instead of an array 
- The note size ratios should be customizable.
- There should be 1 new type of note called "Affiliation", that act like a group for the notes to be in. => Meaning, their location is should now be defined by the Group they're in if they have a group (Affiliation)
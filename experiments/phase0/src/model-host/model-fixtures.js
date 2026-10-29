// Fixed, local-only regression inputs. This is not threshold tuning (task 2.4).
export const EMBEDDING_QUALITY_CASES = [
    {
        task: 'DBMS assignment on normalization',
        related: ['Third normal form explained', 'Functional dependencies tutorial', 'Database normalization and lossless decomposition'],
        unrelated: ['IPL cricket highlights', 'Buy sneakers online', 'Easy chocolate cake recipes'],
    },
    {
        task: 'Write a cover letter for a software engineering internship',
        related: ['How to write a software engineering cover letter', 'Internship cover letter examples', 'Describe coding projects in job applications'],
        unrelated: ['Champions League goal highlights', 'Simple chocolate cake recipe', 'Best beaches for a winter holiday'],
    },
    {
        task: 'Learn JavaScript promises and async/await',
        related: ['JavaScript async/await tutorial', 'Promise.all versus Promise.allSettled', 'Handling asynchronous errors in JavaScript'],
        unrelated: ['IPL cricket highlights', 'Wedding dresses sale', 'Homemade sourdough bread'],
    },
];

const examples = `Rewrite each distracting heading as a sweet, slightly unsettling line from Butu, a lonely teddy bear. Mention the task.
Task: maths homework
Heading: Funny dog videos
Line: The puppies can wait. You promised we'd do our maths homework together.
Task: history essay
Heading: Shoes on sale
Line: I'll keep your place beside the history essay. Please come back soon.`;

export const TEXT_QUALITY_PROMPTS = [
    'Rewrite as a sad little ghost would say it: Breaking news about cricket',
    'Write one short, sweet but lonely reminder from a teddy bear called Butu. Mention the DBMS assignment. The user is watching cricket instead of working.',
    `${examples}\nTask: DBMS assignment\nHeading: Breaking news about cricket\nLine:`,
    `${examples}\nTask: internship cover letter\nHeading: Flash sale on sneakers\nLine:`,
    `${examples}\nTask: biology exam\nHeading: Funny cat videos\nLine:`,
    "Rewrite this reminder to sound sweet and lonely, keeping the words 'JavaScript homework': You left me alone with the JavaScript homework.",
];

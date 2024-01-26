import OpenAI from "openai"

// Get the div elements
const translateInputs = document.querySelector('.TranlateInputs');
const textToTranslate = document.querySelector('.textToTranslate textarea');
const textToTranslateText = document.querySelector('.textToTranslate h2');
const userTranslationDiv = document.querySelector('.UserTranslation');
const userTranslation = userTranslationDiv.querySelector('textarea');
const selectLanguageDiv = document.querySelector('.selectLanguage');
const languageButtons = selectLanguageDiv.querySelectorAll('input');

// Get the translate button
const translateBtn = document.querySelector('#translate-btn');

// Add event listener to the translate button
translateBtn.addEventListener('click', translate);

async function translate() {
    // If the button says "Start Over", reset the page
    if (translateBtn.innerText === 'Start Over') {
        textToTranslate.value = '';
        userTranslation.value = '';
        userTranslationDiv.style.display = 'none';
        selectLanguageDiv.style.display = 'block';
        translateBtn.innerText = 'Translate';
        textToTranslateText.innerText = 'Text To Translate';
        return;
    }

    // Get the user input
    const userInput = textToTranslate.value;

    // Get the selected language
    let language;
    languageButtons.forEach((button) => {
        if (button.checked) {
            language = button.value;
        }
    });

    const messages = [
        {
            role: 'system',
            content: `You are an expert translator. Translate whatever the user enters into ${language}`
        },
        {
            role: 'user',
            content: userInput
        }
    ];

    try {
        const openai = new OpenAI({
            apiKey: '123456',
            dangerouslyAllowBrowser: true
        })
        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: messages,
            temperature: 1.1,
            presence_penalty: 0,
            frequency_penalty: 0
        });
        displayTranslation(response.choices[0].message.content);

    } catch (err) {
        console.log('Error:', err);
        userTranslation.innerText = 'Unable to access AI. Please refresh and try again';
    }
}

function displayTranslation(translation) {
    // Display the translation and hide the language selection
    userTranslation.value = translation;
    userTranslationDiv.style.display = 'block';
    selectLanguageDiv.style.display = 'none';

    // Change the button text to "Start Over"
    translateBtn.innerText = 'Start Over';
    textToTranslateText.innerText = 'Original Text';
}

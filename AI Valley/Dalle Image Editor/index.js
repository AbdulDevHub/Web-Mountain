import OpenAI from "openai";
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
});

const image = await openai.images.edit({ 
    image: await fetch("images/building.png"),
    mask: await fetch("images/mask.png"),
    prompt: "A modern building covered with glass windows and sustained by steel columns",
});

document.body.innerHTML = `<img src="${image.data[0].url}" alt="AI-generated image">`;
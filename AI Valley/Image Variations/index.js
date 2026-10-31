import OpenAI from "openai";
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
});

const image = await openai.images.createVariation({
  image: await fetch("images/joey.png"),
  response_format: "b64_json",
  size: "256x256",
  n: 3
});
console.log(image.data);

document.body.innerHTML = `
  <img src="data:image/png;base64,${image.data[0].b64_json}" alt="AI-generated image">
`;
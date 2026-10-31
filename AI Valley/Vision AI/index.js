import OpenAI from "openai";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

const imgURL = "https://scrimba.com/links/cheese-1-img";
const imgURL2 = "https://scrimba.com/links/cheese-2-img";

const response = await openai.chat.completions.create({
  model: "gpt-4-vision-preview",
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "What's the difference between these two types of cheese?" },
        {
          type: "image_url",
          image_url: {
            url: imgURL
          }
        },
        {
          type: "image_url",
          image_url: {
            url: imgURL2
          }
        }
      ]
    }
  ]
});
console.log(response.choices[0]);

document.body.innerHTML = `
  <img src="${imgURL}" alt="Cheese">
  <img src="${imgURL2}" alt="Cheese">
`;

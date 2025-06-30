
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GeminiTransaction } from '../types';

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set for Gemini API. The app will not function correctly.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const cleanJsonString = (text: string): string => {
  let jsonStr = text.trim();
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
  const match = jsonStr.match(fenceRegex);
  if (match && match[2]) {
    jsonStr = match[2].trim();
  }
  return jsonStr;
};

export const generateTransactionsFromText = async (inputText: string): Promise<GeminiTransaction[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY is not configured.");
  }
  
  const prompt = `Analise o texto a seguir. Se contiver palavras como "VEICULO" ou "PLACA", trate como uma única transação de 'income'. Caso contrário, trate cada linha como uma transação separada de 'expense'.
Regras:
1. Para ENTRADA (income): a descrição é a primeira linha. Extraia o valor e a forma de pagamento. Padronize formas como 'cartão 1x', 'debito', 'crédito' para 'Cartão'. Se for DINHEIRO, mantenha "Dinheiro".
2. Para SAÍDA (expense): a descrição é o texto de cada linha antes do valor.
3. Valor deve ser um número, convertendo vírgula em ponto decimal.
4. O tipo da transação deve ser 'income' ou 'expense'.
Responda com um array de objetos JSON. Cada objeto deve ter "type", "description", "amount", e, se for 'income', "paymentMethod".

Texto:
"${inputText}"`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const cleanedJson = cleanJsonString(response.text);
    const parsedData = JSON.parse(cleanedJson);
    
    if (Array.isArray(parsedData)) {
      return parsedData as GeminiTransaction[];
    }
    return [];
  } catch (error) {
    console.error("Error calling Gemini API for transactions:", error);
    throw new Error("Falha ao gerar transações com a IA. Verifique o formato do texto ou a chave da API.");
  }
};

export const generateServiceOrder = async (inputText: string): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY is not configured.");
    }
    const prompt = `Você é um assistente para uma oficina mecânica especializada em sistemas de direção. Sua tarefa é criar uma nota de serviço concisa e formatada a partir de um texto ditado. A nota deve seguir estritamente o seguinte formato:

[LISTA DE SERVIÇOS/PEÇAS, UM POR LINHA]

VALOR: [VALOR TOTAL DO SERVIÇO]
PAGAMENTO: [FORMA DE PAGAMENTO]
VEICULO: [MODELO DO VEÍCULO]
PLACA: [PLACA DO VEÍCULO]

Exemplo de Saída:
01 REVISÃO NA BOMBA DE DIREÇÃO
01 KIT DE VEDAÇÃO
01 OLEO HID.

VALOR: R$500,00
PAGAMENTO: CARTÃO 4X
VEICULO: LIFAN
PLACA: ous3j11

Analise o texto a seguir e gere a nota. Se alguma informação não for encontrada no texto, use '[A PREENCHER]' no campo correspondente.

Texto ditado: "${inputText}"`;
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-04-17",
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 0 }
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API for service order:", error);
        throw new Error("Falha ao gerar a ordem de serviço com a IA.");
    }
};

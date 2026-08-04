import { paradise } from "../_lib/paradise.js";

function firstNonEmpty(...values) {
    for (const value of values) {
        const text = String(value ?? "").trim();
        if (text) return text;
    }
    return "";
}

function resolvePixVisualData(transaction) {
    const paymentCode = firstNonEmpty(
        transaction?.qr_code,
        transaction?.pix_code
    );

    const paymentCodeBase64 = firstNonEmpty(
        transaction?.qr_code_base64
    ).replace(/^data:image\/[^;]+;base64,/i, "");

    return { paymentCode, paymentCodeBase64 };
}

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {

        const {
            amount,
            sessionId,
            personal,
            reward,
            utm
        } = req.body;

        // Se seus produtos não são cadastrados no painel da Paradise,
        // "source: api_externa" ignora a exigência de productHash.
        // Caso tenha um productHash cadastrado, defina PARADISE_PRODUCT_HASH
        // e troque "source" pelo campo "productHash" abaixo.
        const transaction = await paradise("/transaction.php", {
            method: "POST",
            body: JSON.stringify({
                amount: Math.round(Number(amount) * 100),

                description: reward?.name || "Pedido",

                reference: sessionId,

                source: "api_externa",
                // productHash: process.env.PARADISE_PRODUCT_HASH,

                customer: {
                    name: personal?.name || "",
                    email: personal?.email || "",
                    document: String(personal?.cpf || "").replace(/\D/g, ""),
                    phone: String(personal?.phoneDigits || personal?.phone || "").replace(/\D/g, "")
                },

                tracking: {
                    utm_source: utm?.source || "",
                    utm_medium: utm?.medium || "",
                    utm_campaign: utm?.campaign || "",
                    utm_content: utm?.content || "",
                    utm_term: utm?.term || "",
                    src: utm?.fbclid || utm?.gclid || "",
                    sck: utm?.ttclid || ""
                }
            })
        });

        const {
            paymentCode,
            paymentCodeBase64
        } = resolvePixVisualData(transaction);

        return res.status(200).json({

            success: true,

            // transaction_id = ID numérico interno da Paradise, usado para consultar status.
            idTransaction: transaction.transaction_id,

            txid: transaction.transaction_id,

            status: transaction.status,

            statusRaw: transaction.status,

            // Campos esperados pelo script.js atual.
            paymentCode,

            paymentQrUrl: "",

            paymentCodeBase64,

            // Mantidos para compatibilidade com versoes anteriores.
            pixCode: paymentCode,

            copyPaste: paymentCode,

            qrCode: paymentCodeBase64,

            qrCodeBase64: paymentCodeBase64,

            amount: transaction.amount / 100,

            amount_cents: transaction.amount,

            expiresAt: transaction.expires_at || null,

            rewardId: reward?.id || "bag"

        });

    } catch (e) {

        console.error(e);

        return res.status(500).json({
            success: false,
            error:
                e?.error?.message ||
                e?.message ||
                "Erro ao gerar PIX"
        });

    }

}

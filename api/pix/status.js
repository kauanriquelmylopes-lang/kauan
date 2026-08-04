import { paradise } from "../_lib/paradise.js";

function firstNonEmpty(...values) {
    for (const value of values) {
        const text = String(value ?? "").trim();
        if (text) return text;
    }
    return "";
}

export default async function handler(req, res) {

    if (req.method !== "POST" && req.method !== "GET") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {

        // O frontend envia POST com { txid }. GET com ?id= continua funcionando.
        const id = firstNonEmpty(
            req.body?.txid,
            req.body?.id,
            req.query?.txid,
            req.query?.id
        );

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "ID da transacao nao informado"
            });
        }

        const tx = await paradise(
            `/query.php?action=get_transaction&id=${encodeURIComponent(id)}`
        );

        return res.status(200).json({

            success: true,

            idTransaction: tx.id,

            txid: tx.id,

            status: tx.status,

            statusRaw: tx.status,

            paid: String(tx.status).toLowerCase() === "approved",

            amount: tx.amount / 100,

            amount_cents: tx.amount

        });

    } catch (e) {

        console.error(e);

        return res.status(500).json({
            success: false,
            error:
                e?.error?.message ||
                e?.message ||
                "Erro ao consultar pagamento"
        });

    }

}

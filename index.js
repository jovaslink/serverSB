const express = require("express");
const Stripe = require("stripe");
const cors = require("cors");

const app = express();
const stripe = new Stripe("sk_test_L2cKpgElHowzUqPmZ4Ugw5ab00hQWgFuX2");

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

//Cancelar suscripcion
app.post("/api/cancel-subscription", async (req, res) => {
  // Delete the subscription
  const deletedSubscription = await stripe.subscriptions.del(
    req.body.subscriptionId
  );
  res.send(deletedSubscription);
});

//Recuperamos el metodo de pago, para mostrar la terminacion de la tarjeta
app.post("/api/retrieve-customer-payment-method", async (req, res) => {
  const paymentMethod = await stripe.paymentMethods.retrieve(
    req.body.paymentMethodId
  );

  res.send(paymentMethod);
});

//Falla la tareja e intentamos nuevos metodos de pago.
app.post("/api/retry-invoice", async (req, res) => {
  try {
    await stripe.paymentMethods.attach(req.body.paymentMethodId, {
      customer: req.body.customerId,
    });
    await stripe.customers.update(req.body.customerId, {
      invoice_settings: {
        default_payment_method: req.body.paymentMethodId,
      },
    });
  } catch (error) {
    // in case card_decline error
    return res
      .status("402")
      .send({ result: { error: { message: error.message } } });
  }
  try {
    await stripe.invoices.pay(req.body.invoiceId);
  } catch (error) {
    console.log(error.raw.message);
  }

  const invoice = await stripe.invoices.retrieve(req.body.invoiceId, {
    expand: ["payment_intent"],
  });
  res.send(invoice);
});

//Consultamos invoice getinvoice
app.post("/api/getinvoice", async (req, res) => {
  const idInvoice = req.body.idInvoice;

  const retriveInvoice = await stripe.invoices.retrieve(idInvoice);

  res.send(retriveInvoice);
});

//Consultamos suscripcion
app.post("/api/getsubscription", async (req, res) => {
  const idSubscription = req.body.idSubscription;

  const retriveSubscription = await stripe.subscriptions.retrieve(
    idSubscription
  );

  res.send(retriveSubscription);
});

//Nueva suscripcion
app.post("/api/sbsubscription", async (req, res) => {
  const idPaymentMethod = req.body.id;
  const email = req.body.email;
  const description = req.body.name;

  const customer = await stripe.customers.create({
    description: description,
    email: email,
  });
  const idCustomer = customer.id;

  try {
    await stripe.paymentMethods.attach(idPaymentMethod, {
      customer: idCustomer,
    });
  } catch (error) {
    return res.status("402").send({ error: { message: error.message } });
  }

  await stripe.customers.update(idCustomer, {
    invoice_settings: {
      default_payment_method: idPaymentMethod,
    },
  });

  const subscription = await stripe.subscriptions.create({
    customer: idCustomer,
    items: [{ price: "price_1I7AvlKeEEQAvKfhUXADdrFg" }],
    expand: ["latest_invoice.payment_intent"],
  });

  res.send(subscription);
});

app.listen(3001, () => {
  console.log("Devco Server on PORT: ", 3001);
});

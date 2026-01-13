<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice #{{ $order->id }}</title>
    <style>
        body { font-family: 'Helvetica', sans-serif; color: #333; line-height: 1.5; margin: 0; padding: 0; }
        .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; background: #fff; }
        .header { display: table; width: 100%; margin-bottom: 30px; }
        .logo { display: table-cell; vertical-align: middle; }
        .invoice-title { display: table-cell; text-align: right; vertical-align: middle; }
        .logo h1 { color: #2563eb; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -1px; }
        .invoice-title h2 { margin: 0; font-size: 24px; color: #666; text-transform: uppercase; }
        .invoice-title p { margin: 5px 0 0; color: #999; font-size: 14px; }
        
        .address-box { display: table; width: 100%; margin-bottom: 40px; }
        .billed-to { display: table-cell; width: 50%; }
        .order-info { display: table-cell; width: 50%; text-align: right; }
        .address-box h3 { font-size: 12px; color: #999; text-transform: uppercase; margin-bottom: 10px; }
        .address-box p { margin: 2px 0; font-size: 14px; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        thead th { background: #f8fafc; border-bottom: 2px solid #e2e8f0; padding: 12px; font-size: 12px; text-transform: uppercase; text-align: left; }
        tbody td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        
        .totals { margin-left: auto; width: 300px; }
        .total-row { display: table; width: 100%; margin-bottom: 5px; }
        .total-label { display: table-cell; font-size: 14px; color: #666; }
        .total-value { display: table-cell; text-align: right; font-weight: bold; font-size: 14px; }
        .grand-total { border-top: 2px solid #2563eb; margin-top: 10px; padding-top: 10px; }
        .grand-total .total-label { font-size: 18px; color: #000; font-weight: 900; }
        .grand-total .total-value { font-size: 20px; color: #2563eb; font-weight: 900; }
        
        .footer { margin-top: 50px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="invoice-box">
        <div class="header">
            <div class="logo">
                <h1>SoloCart.</h1>
            </div>
            <div class="invoice-title">
                <h2>Invoice</h2>
                <p>#{{ $order->id }}</p>
                <p>{{ $order->created_at->format('F d, Y') }}</p>
            </div>
        </div>

        <div class="address-box">
            <div class="billed-to">
                <h3>Billed To</h3>
                <p><strong>{{ $order->user->name }}</strong></p>
                <p>{{ $order->address }}</p>
                <p>{{ $order->user->email }}</p>
            </div>
            <div class="order-info">
                <h3>Payment Details</h3>
                <p>Method: {{ strtoupper($order->payment_method) }}</p>
                <p>Status: {{ strtoupper($order->payment_status) }}</p>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Item Description</th>
                    <th class="text-center">Qty</th>
                    <th class="text-right">Price</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($order->items as $item)
                <tr>
                    <td>{{ $item->product->name }}</td>
                    <td class="text-center">{{ $item->quantity }}</td>
                    <td class="text-right">${{ number_format($item->price, 2) }}</td>
                    <td class="text-right">${{ number_format($item->price * $item->quantity, 2) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        @php
            $subtotal = $order->items->sum(function($item) { return $item->price * $item->quantity; });
            $shipping_fee = $subtotal > 500 ? 0 : 60;
            $platform_fee = 10;
        @endphp

        <div class="totals">
            <div class="total-row">
                <div class="total-label">Subtotal:</div>
                <div class="total-value">${{ number_format($subtotal, 2) }}</div>
            </div>
            <div class="total-row">
                <div class="total-label">Shipping Fee:</div>
                <div class="total-value">{{ $shipping_fee == 0 ? 'FREE' : '$' . number_format($shipping_fee, 2) }}</div>
            </div>
            <div class="total-row">
                <div class="total-label">Platform Fee:</div>
                <div class="total-value">${{ number_format($platform_fee, 2) }}</div>
            </div>
            <div class="total-row grand-total">
                <div class="total-label">Total Amount:</div>
                <div class="total-value">${{ number_format($order->total, 2) }}</div>
            </div>
        </div>

        <div class="footer">
            <p>Thank you for your business! This is a computer-generated invoice.</p>
            <p>&copy; {{ date('Y') }} SoloCart Inc. All rights reserved.</p>
        </div>
    </div>
</body>
</html>

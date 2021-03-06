$(document).ready(function(){
    $(document).on('click', '#loadOrders', function(){
        $.get( '/allegro/load-orders', function( data ) {
            if( !data.success ) {
                console.log( data );
                return alert( 'Podczas odpytywania /alllegro/load-orders doszło do błędu.' );
            }
    
            let orders = data.orderList;
    
            if( typeof orders === 'object' && orders.length ) {
                $('#orderData').empty();

                for( var oid in orders ) {
                    let orderData = orders[ oid ], itemsText = '';
                    
                    console.log( orderData );
                    
                    for( var iid in orderData.lineItems ) {
                        itemsText += '<li><strong class="offerWfMag">' + orderData.lineItems[ iid ].offer.id + '</strong> - ' + orderData.lineItems[ iid ].offer.name + '</li>';
                    }
                    
                    $('#orderData').append( orderTableList.
                        replaceAll( '{nr}', orderData.id ).
                        replaceAll( '{customer}', orderData.buyer.login ).
                        replaceAll( '{price}', orderData.summary.totalToPay.amount + ' ' + orderData.summary.totalToPay.currency ).
                        replaceAll( '{status}', parseOrderStatus( orderData.status ) ).
                        replaceAll( '{items}', itemsText ).
                        replaceAll( '{message}', orderData.messageToSeller ?? 'Brak' ).
                        replaceAll( '{delivery.type}', orderData.delivery.method.name ).
                        replaceAll( '{delivery.status}', orderData.fulfillment.status )
                    );
                }
            }
        });
    });
    
    $(document).on('click', '#refreshOrders', function(){
        $.get( '/allegro/refresh-orders', function( data ) {
            if( !data.success ) {
                console.log( data );
                return alert( 'Podczas odpytywania /alllegro/refresh-orders doszło do błędu.' );
            }
            
            console.log( data );
            alert('refreshOrders');
        });
    });
    
    $(document).on('click', '.offerWfMag', function(){
        $.get( '/allegro/refresh-orders', function( data ) {
        });
    });
    
    /*$.get( '/get-order-list', function( data ) {
        if( data.success != 'true') return alert( 'Wystąpił błąd podczas pobierania zamówien! ');
            
        data['orders'] = JSON.parse(data['orders']);
        for( var order in data['orders'] ) {
            var orderData = data['orders'][ order ];
            
            console.log( orderData );
            $('#orderData').append(
        '<tr data-toggle="collapse" data-target="#details'+ orderData.id +'" class="accordion-toggle">'+
        $('#sampleData').html().replace( '{nr}', orderData.id ).
            replace( '{customer}', ( orderData.billing.company == '' ? ( orderData.billing.first_name + ' ' + orderData.billing.last_name ) : orderData.billing.company ) ).
            replace( '{price}', orderData.total + ' ' + orderData.currency_symbol ).
            replace( '{status}', orderData.status )+
        '</tr> <tr><td colspan="5" class="p-0" ><div class="accordian-body collapse" id="details'+ orderData.id +'">Dane kontrahenta: '+ JSON.stringify(orderData) +'</div></td></tr>'
            );
        }
            
        //console.log(data.orders);
    });*/
    
    let orderTableList = `
    <tr data-toggle="collapse" data-target="#details{nr}" class="accordion-toggle">
        <th scope="row">{nr}</th>
        <td>{customer}</td>
        <td>{price}</td>
        <td>{delivery.status}</td>
        <td><button class="btn btn-info">Szczegóły</button></td>
    </tr>
    <tr>
        <td colspan="5" class="p-0">
    <div class="accordian-body collapse mb-3" id="details{nr}">
        <div class="row mt-3">
    <div class="col-4">
        <strong>Artykuły:</strong>
        <ul>
    {items}
        </ul>
    </div>
    <div class="col-4">
        <strong>Wysyłka:</strong> {delivery.type}<br>
        <strong>Status wysyłki:</strong> {delivery.status}<br>
        <strong>Status zamówienia:</strong> {status}
    </div>
    <div class="col-4">
        <strong>Widomość dla sprzedającego:</strong> {message}
    </div>
        </div>
    </div>
        </td>
    </tr>`;
    
    function parseOrderStatus( status ) {
        switch( status ) {
            case 'BOUGHT': return 'Niezapłacone';
            case 'FILLED_IN': return 'Przetwarzane przez allegro';
            case 'READY_FOR_PROCESSING': return 'Gotowe do realizacji';
            case 'BUYER_CANCELLED': return 'Anulowane';
            case 'FULFILLMENT_STATUS_CHANGED': return 'Status poprzez allegro.pl';
            case 'BUYER_MODIFIED': return 'Zamówienie zmodyfikowane';
        }
    }
});
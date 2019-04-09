$(function() {
  $('table .quantity:first').focus();
  $('[max]').change(function() {
    var max = parseInt($(this).attr('max'), 10);
    var value = parseInt($(this).val(), 10) || 0;
    if (value > max) {
      alert('We only have ' + max + ' of this item in stock');
      $(this).val(max);
    }
  });

  // Change displayed collection
  $('#select-collection').change(function(){
    document.location.href = '/pages/order-form/'+ $(this).val();
  });

  // Order form popup
  $('.configure-options').click(function(event) {
    event.preventDefault()
    console.log('hello')
    $('#order-form-modal').addClass('modal--is-active')
  });

  var getParameter = function(parameter, selector) {
    var variantId = $(selector).find('select').val() || $(selector).find('data').val();
    var parameterId = '#'+ parameter + '-' + variantId + '-' + $(selector).attr('row');
    return $(selector).find(parameterId);
  }

  //Initial form setup
  $( document ).ready(function() {
    $("tr[row='1']").show();
    $('.price').hide();
    $('.quantity-field').hide();
    $('tr').each(function() {
      var variantId = $(this).find('select').val() || $(this).find('data').val();
      var priceId = '#p-' + variantId + '-' + $(this).attr('row');
      var quantityId = '#q-' + variantId + '-' + $(this).attr('row');
      $(priceId).show();
      $(quantityId).show();
    });
  });

  // Change the price and quantity to align with the selected option
  $('select').change(function(){
    var priceId = '#p-' + $(this).val() + '-' + $(this).parents('tr').attr('row');
    var quantityId = '#q-' + $(this).val() + '-' + $(this).parents('tr').attr('row');
 	$(priceId).siblings().hide();
    $(priceId).show();
    $(quantityId).siblings().hide();
    $(quantityId).show();
  });

  // Add another row if selected variant has line item properties or options
  $('tr').change(function() {
    var quantity = parseInt(getParameter('q', this).val());
    if (quantity > 0) {
      $(this).next().fadeIn();
  	}
  });

  // Running cart total
  $('.quantity-field').change(function(){
    var cartTotal = 0;
    $('tr').each(function(){
      var price = parseFloat(getParameter('p', this).text().slice(2));
      var quantity = parseInt(getParameter('q', this).val());
      cartTotal += price*quantity;
    });
    $('.cart-total').html(cartTotal.toFixed(2));
  });

  // Hide popup error message on moveover
  $('.order-form__tablecell--popuptext').hover(function() {
    console.log('POP IT')
    $(this).fadeOut();
  });

  // Add selected items to Cart
  // Source: https://help.shopify.com/en/themes/development/getting-started/using-ajax-api#youre-building-a-quick-order-form-beware
  var cartQueue = [];

  var moveAlong = function() {
    if (cartQueue.length) {
      var request = cartQueue.shift();
      console.log(request);
      addItem(request.variantId, request.quantity, request.properties);
    }
    else {
      document.location.href = '/checkout';
    }
  };

  var addItem = function(variantId, quantity, properties) {
    jQuery.post( '/cart/add.js', { quantity: quantity, id: variantId, properties: properties}, null, "json")
    .done(function(response) {
      console.log('Post Done!', response);
      moveAlong();
    });
  }

  var radioButtonMessage = function(el) {
  	console.log('oh no', el)
    el.find('.order-form__tablecell--popuptext').show()
    $('.order-form__error-message').fadeIn()
  }

  $('#post-order').submit(function(event) {
    event.preventDefault()
    var optionalCheckboxName = $('label.optional-checkbox-label').eq(0).text();
    var requiredRadioButtonName = $('label.required-label').eq(0).text();
    var radioButtonChecked = true;
    $('tr').each(function() {
      var quantity = parseInt(getParameter('q', this).val());
      var properties = {}
      if ( quantity > 0 ) {
        if ($(this).find('input.optional-checkbox').length > 0) {
          properties[optionalCheckboxName] = $(this).find('input.optional-checkbox:checked').val() || 'No'
        }
        if ($(this).find('input.required').length > 0) {
          properties[requiredRadioButtonName] = $(this).find('input.required:checked').val()
          if (!(properties[requiredRadioButtonName])) {
            radioButtonMessage($(this));
            radioButtonChecked = false;
          }
        }
        cartQueue.push({
          variantId: $(this).find('select').val() || $(this).find('data').val(),
          quantity: quantity,
          properties: properties
        });
      }
    });
    if (radioButtonChecked) {
      moveAlong();
    } else {
      cartQueue = [];
    }
  });
});
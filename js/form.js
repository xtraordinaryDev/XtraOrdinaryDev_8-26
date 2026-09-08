// Contact form: validates, then submits to Web3Forms (https://web3forms.com), which emails the
// submission to the address the access key was created for. The site is hosted on GitHub Pages,
// so there is no server-side code – the old mail.php cannot run there.
//
// Setup: create a free access key at https://web3forms.com (enter the inbox address; the key is
// emailed to you) and paste it into the hidden "access_key" input on contact.html.

(function ($) {
  var ENDPOINT = 'https://api.web3forms.com/submit';

  function validateEmail(email) {
    return /^([\w\-\.]+@([\w\-]+\.)+[\w\-]{2,4})?$/.test(email);
  }

  function mark($el, ok) {
    $el.css('border-color', ok ? '#ccc' : '#EF4036');
    if (!ok) $el.focus();
  }

  $('#connect').click(function (event) {
    event.preventDefault();

    var $form = $('#wos-contact-form');
    var $button = $(this);
    var firstName = $.trim($('#userName').val());
    var lastName = $.trim($('#lastName').val());
    var phone = $.trim($('#phone').val());
    var email = $.trim($('#userEmail').val());
    var topic = $.trim($('#subject').val());
    var message = $.trim($('#content').val());
    var terms = $('#check1').prop('checked');
    var role = $("input[name='radio_group']:checked").val();
    var smsConsent = $('#smsConsent').prop('checked');

    $('.notvalid, .wos-success').remove();

    var valid = firstName !== '' && lastName !== '' && (!smsConsent || phone !== '') &&
      topic !== '' && message !== '' && email !== '' && validateEmail(email) && terms && role !== undefined;

    if (!valid) {
      // highlight in reverse order so focus lands on the first problem field
      mark($('#content'), message !== '');
      $('.custom-radio-option').toggleClass('error', !role).toggleClass('valid', !!role);
      mark($('#subject'), topic !== '');
      mark($('#phone'), !(smsConsent && phone === ''));
      mark($('#userEmail'), email !== '' && validateEmail(email));
      mark($('#lastName'), lastName !== '');
      mark($('#userName'), firstName !== '');
      $button.after('<div class="notvalid bg-danger">Please fill form correctly.</div>');
      return;
    }

    var accessKey = $form.find('input[name="access_key"]').val();
    if (!accessKey || accessKey.indexOf('YOUR_') === 0) {
      console.error('Contact form: Web3Forms access_key is not set on contact.html');
      $button.after('<div class="notvalid bg-danger">The form is not configured yet. Please email us directly.</div>');
      return;
    }

    // Web3Forms accepts the form fields as JSON and forwards every field in the email.
    var payload = {};
    $.each($form.serializeArray(), function (_, field) { payload[field.name] = field.value; });
    payload.subject = 'New inquiry from x-traordinarydevelopment.com: ' + topic;
    payload.from_name = firstName + ' ' + lastName;
    payload.sms_consent = smsConsent ? 'Yes' : 'No';
    payload.terms = terms ? 'Accepted' : 'Not accepted';

    $button.prop('disabled', true).after('<div class="wos-success"></div>');

    $.ajax({
      type: 'POST',
      url: ENDPOINT,
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify(payload),
      success: function (res) {
        if (res && res.success) {
          if (window.gtag) gtag('event', 'generate_lead', { method: 'contact_form' });
          $('.wos-success').text('Thank you. Your message has been sent successfully!').fadeIn(300);
          $form[0].reset();
          $('.custom-radio-option').removeClass('valid error');
        } else {
          $('.wos-success').remove();
          $button.after('<div class="notvalid bg-danger">Oops. The message could not be sent. Please email us directly.</div>');
        }
      },
      error: function () {
        $('.wos-success').remove();
        $button.after('<div class="notvalid bg-danger">Oops. The message could not be sent. Please email us directly.</div>');
      },
      complete: function () {
        $button.prop('disabled', false);
      }
    });
  });
})(jQuery);

<?php

$to = "xtraordinaryDev@outlook.com";


$fname = $_POST["fname"];
$lname = $_POST["lname"];
$email = $_POST["email"];
$phone = $_POST["phone"];
$subject = $_POST["topic"];
$choice   = $_POST['radio_group'] ?? '';
$message = $_POST["message"];
$terms    = isset($_POST['terms']) ? 'Accepted' : 'Not accepted'; // checkbox

$sms_consent = (isset($_POST['sms_consent']) && $_POST['sms_consent'] === 'yes') ? 'Yes' : 'No';
$sms_consent_timestamp = $_POST['sms_consent_timestamp'] ?? '';
$sms_consent_url = $_POST['sms_consent_url'] ?? '';
$sms_consent_language = $_POST['sms_consent_language'] ?? '';

$msg = "First Name: ".$fname."<br>";
$msg .= "Last Name: ".$lname."<br>";
$msg .= "Phone Number: ".$phone."<br>";
$msg .= "Email: ".$email."<br>";
$msg .= "Choose a topic: ".$subject."<br>";
$msg .= "Which best describes you?: ".$choice."<br>";
$msg .= "Mesasge: ".$message."<br>";
$msg .= "Terms Accepted:: ".$terms."<br>";
$msg .= "SMS Consent: ".$sms_consent."<br>";
$msg .= "SMS Consent Timestamp: ".$sms_consent_timestamp."<br>";
$msg .= "SMS Consent URL: ".$sms_consent_url."<br>";
$msg .= "SMS Consent Language: ".$sms_consent_language."<br>";

$headers = "MIME-Version: 1.0" . "\r\n";
$headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
$headers .= "From: xtraordinaryDev@outlook.com\r\n";
$headers .= "Reply-To: ".$email."\r\n";

$mailSent = mail($to, $subject, $msg, $headers);

if ($mailSent) {
    echo "Thanks you. Your message has been sent successfully!";
} else {
    echo "Oops. email not send!";
}


?>

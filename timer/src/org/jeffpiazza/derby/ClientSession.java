package org.jeffpiazza.derby;

import java.io.ByteArrayInputStream;
import org.w3c.dom.Element;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStreamWriter;
import java.net.*;

public class ClientSession {
  private CookieManager manager;
  private String base_url;
  private String original_base_url;

  public ClientSession(String base_url) {
    String lowercase_url = base_url.toLowerCase();
    if (!lowercase_url.startsWith("http://")
        && !lowercase_url.startsWith("https://")) {
      base_url = "http://" + base_url;
    }
    if (!base_url.endsWith("/")) {
      base_url += "/";
    }
    original_base_url = base_url;
    manager = new CookieManager();
    manager.setCookiePolicy(CookiePolicy.ACCEPT_ALL);
    CookieHandler.setDefault(manager);
    this.base_url = base_url;
  }

  public String getBaseUrl() {
    return base_url;
  }

  // Repeated calls to makeUrlVariation should rewrite base_url to different
  // variations of the original URL, or return false if there are no more.
  // This implementation considers only one variation.
  private boolean makeUrlVariation() {
    if (base_url == original_base_url) {  // ptr equality OK for this
      if (base_url.endsWith("/derbynet/")) {
        base_url = base_url.substring(0, base_url.lastIndexOf("derbynet/"));
      } else {
        base_url = base_url + "derbynet/";
      }
      System.err.println();
      System.err.println("Trying URL variation " + base_url);
      return true;
    }
    return false;
  }

  public Element login(String username, String password) throws IOException {
    return doPostWithVariations("action.php",
                                "action=login&name=" + username + "&password=" + password);
  }

  public Element sendTimerMessage(String messageAndParams) throws IOException {
    return doPost("action=timer-message&" + messageAndParams);
  }

  public Element doPost(String params) throws IOException {
    return doPost("action.php", params);
  }

  private Element doPostWithVariations(String url_path, String params)
      throws IOException {
    Element result;

    do {
      result = doPost(url_path, params);
    } while (result == null && makeUrlVariation());

    return result;
  }

  private Element doPost(String url_path, String params) throws IOException {
    return doPost(new URL(base_url + url_path), params);
  }

  private Element doPost(URL url, String params) throws IOException {
    // TODO Sun Security Validator failed
    HttpURLConnection connection = (HttpURLConnection) url.openConnection();
    connection.setRequestMethod("POST");
    connection.addRequestProperty("User-Agent",
                                  "derby-timer.jar/" + Version.get());

    connection.setDoOutput(true);
    OutputStreamWriter writer =
        new OutputStreamWriter(connection.getOutputStream());
    writer.write(params);
    writer.flush();
    writer.close(); // writer.close() may block.

    return getResponse(connection);
  }

  public Element doQueryWithVariations(String q) throws IOException {
    Element result;

    do {
      result = doQuery(q);
    } while (result == null && makeUrlVariation());

    return result;
  }

  public Element doQuery(String q) throws IOException {
    return doQuery(new URL(base_url + "action.php?query=" + q));
  }

  public Element doQuery(String q, String params) throws IOException {
    return doQuery(new URL(base_url + "action.php?query=" + q + "&" + params));
  }

  // Overridden by SimulatedClientSession
  protected Element doQuery(URL url) throws IOException {
    HttpURLConnection connection = (HttpURLConnection) url.openConnection();
    connection.setRequestMethod("GET");
    connection.addRequestProperty("User-Agent",
                                  "derby-timer.jar/" + Version.get());
    return getResponse(connection);
  }

  private Element getResponse(HttpURLConnection connection) throws IOException {
    // This code will block until a response is actually received.  That should
    // be OK as long as there's a thread dedicated to handling requests in
    // this session.
    if (connection.getResponseCode() == 200) {
      return parseResponse(connection.getInputStream());
    }

    return null;
  }

  protected Element parseResponse(String s) throws IOException {
    return parseResponse(new ByteArrayInputStream(s.getBytes("UTF-8")));
  }

  protected Element parseResponse(final InputStream inputStream)
      throws IOException {
    inputStream.mark(10000);
    try {
      DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
      DocumentBuilder db = dbf.newDocumentBuilder();
      try {
        return db.parse(inputStream).getDocumentElement();
      } catch (Exception e) {
        System.err.println("Failed");
        e.printStackTrace();
      }
    } catch (Exception e) {
      e.printStackTrace();
    }
    System.out.
        println(Timestamp.string() + ": Unparseable response for message");
    inputStream.reset();
    byte[] buffer = new byte[1024];
    int bytesRead;
    while ((bytesRead = inputStream.read(buffer)) != -1) {
      System.out.write(buffer, 0, bytesRead);
    }
    return null;
  }

  public static boolean wasSuccessful(Element response) {
    if (response == null) {
      return false;
    } else if (response.getElementsByTagName("success").getLength() == 0
        || response.getElementsByTagName("failure").getLength() > 0) {
      System.out.println(Timestamp.string() + ": Message resulted in failure");
      System.out.println("=======================");
      System.out.println(XmlSerializer.serialized(response));
      System.out.println("=======================");
      return false;
    } else {
      return true;
    }
  }
}

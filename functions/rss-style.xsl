<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <title>
          Atom Feed | <xsl:value-of select="/atom:feed/atom:title"/>
        </title>
        <meta charset="utf-8"/>
        <meta http-equiv="content-type" content="text/html; charset=utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link rel="stylesheet" href="/assets/styles.css"/>
      </head>
      <body>
        <main class="layout-content">
          <div class="alert-box">
            <strong>This is an Atom feed</strong>. Subscribe by copying
            the URL from the address bar into your feed reader. Visit <a
            href="https://aboutfeeds.com">About Feeds</a> to learn more and get started. It’s free.
          </div>
          <div class="py-7">
            <h1>Atom Feed Preview</h1>
            <h2><xsl:value-of select="/atom:feed/atom:link[@rel='alternate']/@href"/></h2>
            <p>
              <xsl:value-of select="/atom:feed/atom:subtitle"/>
            </p>
            <a href="{/atom:feed/atom:link[@rel='alternate']/@href}">Visit Website &#x2192;</a>

            <h2>Recent Shared Chats</h2>
            <xsl:for-each select="/atom:feed/atom:entry">
              <div class="pb-7">
                <div class="text-2 text-offset">
                  Shared on
                  <xsl:value-of select="substring(atom:date, 1, 10)" />
                </div>

                <div class="text-4 font-bold">
                  <a>
                    <xsl:attribute name="href">
                      <xsl:value-of select="atom:title"/>
                    </xsl:attribute>
                    <xsl:value-of select="atom:title"/>
                  </a>
                </div>

                <div class="text-3">
                  <xsl:value-of select="atom:description"/>
                </div>
              </div>
            </xsl:for-each>
          </div>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>

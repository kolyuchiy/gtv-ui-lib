import os
from google.appengine.ext import webapp
from google.appengine.ext.webapp import util
from google.appengine.ext.webapp import template


class MainHandler(webapp.RequestHandler):
  def render_template(self, template_file, template_values=None):
    if not template_values:
      template_values = []
    path = os.path.join(os.path.dirname(__file__), 'templates', template_file)
    self.response.out.write(template.render(path, template_values))

  def get(self):
    demos = [
      {'title': 'Component', 'template': 'component.html'},
      {'title': 'Button', 'template': 'buttons.html'},
      {'title': 'Link', 'template': 'link.html'},
      {'title': 'Container', 'template': 'containers.html'},
      {'title': 'Grid', 'template': 'grid.html'},
      {'title': 'Lightbox', 'template': 'lightbox.html'},
      {'title': 'Tab Container', 'template': 'tabcontainer.html'},
      # TODO(maksym): Input demo.
      {'title': 'AJAX', 'template': 'ajax.html'}]
    self.render_template('main.html', {'demos': demos})


def main():
    application = webapp.WSGIApplication([('/', MainHandler)],
                                         debug=True)
    util.run_wsgi_app(application)


if __name__ == '__main__':
    main()
